from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'sacred-souls-secret-key-2025-extended')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7

# Stripe Settings
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# LLM Settings
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app without a prefix
app = FastAPI(title="Sacred Souls API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ===================== MODELS =====================

SPIRITUAL_INTERESTS = [
    "meditation", "yoga", "astrology", "tarot", "shamanism",
    "nature_spirituality", "buddhism", "hinduism", "energy_healing",
    "reiki", "crystals", "mindfulness", "breathwork", "sound_healing"
]

# Spiritual quote themes for AI generation
QUOTE_THEMES = [
    "inner peace", "mindfulness", "gratitude", "self-love", "nature connection",
    "spiritual growth", "meditation", "healing", "presence", "compassion",
    "wisdom", "enlightenment", "balance", "harmony", "transformation"
]

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    nickname: str
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class QuestionnaireSubmit(BaseModel):
    spiritual_interests: List[str]
    experience_level: str
    looking_for: List[str]

class CircleCreate(BaseModel):
    name: str
    description: str
    is_public: bool = True
    spiritual_focus: List[str] = []

class PostCreate(BaseModel):
    content: str
    circle_id: Optional[str] = None

class GatheringCreate(BaseModel):
    circle_id: str
    title: str
    description: str
    gathering_type: str  # "in_person" or "virtual"
    location: Optional[str] = None  # For in-person
    virtual_link: Optional[str] = None  # For virtual
    date: datetime

class ChatMessageCreate(BaseModel):
    circle_id: str
    content: str

class NotificationSchedule(BaseModel):
    title: str
    body: str
    scheduled_time: datetime
    repeat: Optional[str] = None  # "daily", "weekly", or None

class CheckoutRequest(BaseModel):
    origin_url: str

# ===================== AUTH HELPERS =====================

def create_jwt_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("user_id")
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("session_token")
    
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = verify_jwt_token(token)
    
    if not user_id:
        session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if not session:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        expires_at = session.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        
        user_id = session.get("user_id")
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

async def get_optional_user(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate, response: Response):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    existing_nickname = await db.users.find_one({"nickname": user_data.nickname}, {"_id": 0})
    if existing_nickname:
        raise HTTPException(status_code=400, detail="Nickname already taken")
    
    password_hash = bcrypt.hashpw(user_data.password.encode(), bcrypt.gensalt()).decode()
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user = {
        "user_id": user_id,
        "email": user_data.email,
        "password_hash": password_hash,
        "nickname": user_data.nickname,
        "name": user_data.name or user_data.nickname,
        "picture": None,
        "spiritual_interests": [],
        "subscription_status": "free",
        "has_completed_questionnaire": False,
        "daily_quote": None,
        "last_quote_date": None,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(user)
    
    token = create_jwt_token(user_id)
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60
    )
    
    user_data = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    
    return {"user": user_data, "token": token}

@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not bcrypt.checkpw(credentials.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_jwt_token(user["user_id"])
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60
    )
    
    user_data = {k: v for k, v in user.items() if k != "password_hash"}
    
    return {"user": user_data, "token": token}

@api_router.post("/auth/google-session")
async def process_google_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    async with httpx.AsyncClient() as http_client:
        try:
            auth_response = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            auth_data = auth_response.json()
        except Exception as e:
            logger.error(f"Error calling Emergent Auth: {e}")
            raise HTTPException(status_code=500, detail="Authentication service error")
    
    email = auth_data.get("email")
    name = auth_data.get("name", "")
    picture = auth_data.get("picture", "")
    session_token = auth_data.get("session_token")
    
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        nickname = email.split("@")[0]
        
        counter = 1
        base_nickname = nickname
        while await db.users.find_one({"nickname": nickname}, {"_id": 0}):
            nickname = f"{base_nickname}{counter}"
            counter += 1
        
        user = {
            "user_id": user_id,
            "email": email,
            "password_hash": None,
            "nickname": nickname,
            "name": name,
            "picture": picture,
            "spiritual_interests": [],
            "subscription_status": "free",
            "has_completed_questionnaire": False,
            "daily_quote": None,
            "last_quote_date": None,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(user)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    
    return {"user": user, "token": session_token}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    user.pop("password_hash", None)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ===================== QUESTIONNAIRE ROUTES =====================

@api_router.get("/questionnaire/interests")
async def get_spiritual_interests():
    return {"interests": SPIRITUAL_INTERESTS}

@api_router.post("/questionnaire/submit")
async def submit_questionnaire(
    data: QuestionnaireSubmit,
    user: dict = Depends(get_current_user)
):
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {
                "spiritual_interests": data.spiritual_interests,
                "has_completed_questionnaire": True
            }
        }
    )
    
    await db.questionnaire_responses.insert_one({
        "user_id": user["user_id"],
        "spiritual_interests": data.spiritual_interests,
        "experience_level": data.experience_level,
        "looking_for": data.looking_for,
        "submitted_at": datetime.now(timezone.utc)
    })
    
    return {"message": "Questionnaire submitted successfully"}

# ===================== DAILY QUOTE (AI-GENERATED) =====================

@api_router.get("/quotes/daily")
async def get_daily_quote(user: dict = Depends(get_current_user)):
    """Get AI-generated personalized daily spiritual quote"""
    today = datetime.now(timezone.utc).date().isoformat()
    
    # Check if user already has today's quote
    if user.get("last_quote_date") == today and user.get("daily_quote"):
        return {"quote": user["daily_quote"], "generated_at": today}
    
    # Generate new quote based on user's interests
    interests = user.get("spiritual_interests", ["mindfulness", "inner peace"])
    if not interests:
        interests = ["mindfulness", "inner peace"]
    
    # Select random theme based on interests
    theme = random.choice(interests + QUOTE_THEMES[:5])
    
    try:
        from emergentintegrations.llm.openai import chat, ChatMessage
        
        messages = [
            ChatMessage(
                role="system",
                content="You are a wise spiritual guide. Generate a single, profound spiritual quote (1-2 sentences) that inspires and uplifts. The quote should feel timeless and universal. Do not include quotation marks or attribution."
            ),
            ChatMessage(
                role="user",
                content=f"Generate a unique spiritual quote about {theme} that would resonate with someone interested in {', '.join(interests[:3])}."
            )
        ]
        
        response = await chat(
            api_key=EMERGENT_LLM_KEY,
            messages=messages,
            model="gpt-4o-mini"
        )
        
        quote = response.content.strip().strip('"\'')
        
    except Exception as e:
        logger.error(f"Error generating quote: {e}")
        # Fallback quotes
        fallback_quotes = [
            "The journey within is the greatest adventure you will ever take.",
            "In stillness, we find the answers that noise conceals.",
            "Every breath is an invitation to return to presence.",
            "The light you seek has always been within you.",
            "Nature speaks to those who take the time to listen.",
            "Healing begins when we embrace our whole selves with compassion.",
            "The universe conspires in favor of those who walk their authentic path."
        ]
        quote = random.choice(fallback_quotes)
    
    # Save quote for user
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"daily_quote": quote, "last_quote_date": today}}
    )
    
    return {"quote": quote, "generated_at": today, "theme": theme}

# ===================== SUBSCRIPTION & PAYMENT ROUTES =====================

@api_router.get("/subscription/status")
async def get_subscription_status(user: dict = Depends(get_current_user)):
    subscription = await db.subscriptions.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not subscription:
        return {
            "user_id": user["user_id"],
            "plan": "free",
            "status": "active",
            "price": 0.0
        }
    
    return subscription

@api_router.post("/payments/checkout")
async def create_checkout_session(
    checkout_request: CheckoutRequest,
    request: Request,
    user: dict = Depends(get_current_user)
):
    """Create Stripe checkout session for premium subscription"""
    try:
        from emergentintegrations.payments.stripe.checkout import (
            StripeCheckout, CheckoutSessionRequest
        )
        
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        # Build URLs from frontend origin
        success_url = f"{checkout_request.origin_url}/subscription?session_id={{CHECKOUT_SESSION_ID}}&status=success"
        cancel_url = f"{checkout_request.origin_url}/subscription?status=cancelled"
        
        # Create checkout session for €10/month subscription
        checkout_req = CheckoutSessionRequest(
            amount=10.00,  # €10 per month
            currency="eur",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user["user_id"],
                "plan": "premium",
                "type": "subscription"
            },
            payment_methods=["card"]  # Supports Google Pay via card
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_req)
        
        # Create payment transaction record
        await db.payment_transactions.insert_one({
            "session_id": session.session_id,
            "user_id": user["user_id"],
            "amount": 10.00,
            "currency": "eur",
            "payment_status": "pending",
            "plan": "premium",
            "created_at": datetime.now(timezone.utc)
        })
        
        return {"checkout_url": session.url, "session_id": session.session_id}
        
    except Exception as e:
        logger.error(f"Error creating checkout session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, user: dict = Depends(get_current_user)):
    """Check payment status and activate subscription if paid"""
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update payment transaction
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "payment_status": status.payment_status,
                "status": status.status,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        # If payment successful, activate subscription
        if status.payment_status == "paid":
            # Check if already processed
            existing_sub = await db.subscriptions.find_one({
                "user_id": user["user_id"],
                "session_id": session_id
            })
            
            if not existing_sub:
                expires_at = datetime.now(timezone.utc) + timedelta(days=30)
                
                await db.subscriptions.update_one(
                    {"user_id": user["user_id"]},
                    {"$set": {
                        "plan": "premium",
                        "status": "active",
                        "price": 10.0,
                        "expires_at": expires_at,
                        "session_id": session_id,
                        "created_at": datetime.now(timezone.utc)
                    }},
                    upsert=True
                )
                
                await db.users.update_one(
                    {"user_id": user["user_id"]},
                    {"$set": {"subscription_status": "premium"}}
                )
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount": status.amount_total / 100,  # Convert from cents
            "currency": status.currency
        }
        
    except Exception as e:
        logger.error(f"Error checking payment status: {e}")
        raise HTTPException(status_code=500, detail="Failed to check payment status")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Process webhook event
        if webhook_response.payment_status == "paid":
            user_id = webhook_response.metadata.get("user_id")
            if user_id:
                expires_at = datetime.now(timezone.utc) + timedelta(days=30)
                
                await db.subscriptions.update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "plan": "premium",
                        "status": "active",
                        "price": 10.0,
                        "expires_at": expires_at,
                        "session_id": webhook_response.session_id
                    }},
                    upsert=True
                )
                
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {"subscription_status": "premium"}}
                )
        
        return {"received": True}
        
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"received": True}

@api_router.post("/subscription/upgrade")
async def upgrade_subscription(user: dict = Depends(get_current_user)):
    """Demo upgrade (for testing without real payment)"""
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    
    subscription = {
        "user_id": user["user_id"],
        "plan": "premium",
        "status": "active",
        "price": 10.0,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.subscriptions.update_one(
        {"user_id": user["user_id"]},
        {"$set": subscription},
        upsert=True
    )
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"subscription_status": "premium"}}
    )
    
    return {"message": "Upgraded to premium successfully", "subscription": subscription}

@api_router.post("/subscription/cancel")
async def cancel_subscription(user: dict = Depends(get_current_user)):
    await db.subscriptions.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"status": "cancelled"}}
    )
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"subscription_status": "free"}}
    )
    
    return {"message": "Subscription cancelled"}

# ===================== CIRCLES ROUTES =====================

@api_router.post("/circles")
async def create_circle(
    circle_data: CircleCreate,
    user: dict = Depends(get_current_user)
):
    if user.get("subscription_status") != "premium":
        raise HTTPException(
            status_code=403,
            detail="Premium subscription required to create circles"
        )
    
    circle_id = f"circle_{uuid.uuid4().hex[:12]}"
    circle = {
        "circle_id": circle_id,
        "name": circle_data.name,
        "description": circle_data.description,
        "creator_id": user["user_id"],
        "creator_name": user.get("nickname", user.get("name", "Unknown")),
        "members": [user["user_id"]],
        "is_public": circle_data.is_public,
        "spiritual_focus": circle_data.spiritual_focus,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.circles.insert_one(circle)
    
    return {
        "circle_id": circle_id,
        "name": circle_data.name,
        "description": circle_data.description,
        "creator_id": user["user_id"],
        "creator_name": user.get("nickname", user.get("name", "Unknown")),
        "members_count": 1,
        "is_public": circle_data.is_public,
        "spiritual_focus": circle_data.spiritual_focus,
        "created_at": circle["created_at"],
        "is_member": True
    }

@api_router.get("/circles")
async def get_circles(request: Request):
    user = await get_optional_user(request)
    user_id = user["user_id"] if user else None
    
    circles = await db.circles.find({"is_public": True}, {"_id": 0}).to_list(100)
    
    result = []
    for circle in circles:
        members = circle.get("members", [])
        result.append({
            "circle_id": circle["circle_id"],
            "name": circle["name"],
            "description": circle["description"],
            "creator_id": circle["creator_id"],
            "creator_name": circle.get("creator_name", "Unknown"),
            "members_count": len(members),
            "is_public": circle["is_public"],
            "spiritual_focus": circle.get("spiritual_focus", []),
            "created_at": circle["created_at"],
            "is_member": user_id in members if user_id else False
        })
    
    return result

@api_router.get("/circles/my")
async def get_my_circles(user: dict = Depends(get_current_user)):
    circles = await db.circles.find(
        {"members": user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    
    result = []
    for circle in circles:
        members = circle.get("members", [])
        result.append({
            "circle_id": circle["circle_id"],
            "name": circle["name"],
            "description": circle["description"],
            "creator_id": circle["creator_id"],
            "creator_name": circle.get("creator_name", "Unknown"),
            "members_count": len(members),
            "is_public": circle["is_public"],
            "spiritual_focus": circle.get("spiritual_focus", []),
            "created_at": circle["created_at"],
            "is_member": True
        })
    
    return result

@api_router.get("/circles/{circle_id}")
async def get_circle(circle_id: str, request: Request):
    user = await get_optional_user(request)
    user_id = user["user_id"] if user else None
    
    circle = await db.circles.find_one({"circle_id": circle_id}, {"_id": 0})
    if not circle:
        raise HTTPException(status_code=404, detail="Circle not found")
    
    members = circle.get("members", [])
    return {
        "circle_id": circle["circle_id"],
        "name": circle["name"],
        "description": circle["description"],
        "creator_id": circle["creator_id"],
        "creator_name": circle.get("creator_name", "Unknown"),
        "members_count": len(members),
        "is_public": circle["is_public"],
        "spiritual_focus": circle.get("spiritual_focus", []),
        "created_at": circle["created_at"],
        "is_member": user_id in members if user_id else False
    }

@api_router.post("/circles/{circle_id}/join")
async def join_circle(circle_id: str, user: dict = Depends(get_current_user)):
    circle = await db.circles.find_one({"circle_id": circle_id}, {"_id": 0})
    if not circle:
        raise HTTPException(status_code=404, detail="Circle not found")
    
    if user["user_id"] in circle.get("members", []):
        raise HTTPException(status_code=400, detail="Already a member")
    
    await db.circles.update_one(
        {"circle_id": circle_id},
        {"$addToSet": {"members": user["user_id"]}}
    )
    
    return {"message": "Joined circle successfully"}

@api_router.post("/circles/{circle_id}/leave")
async def leave_circle(circle_id: str, user: dict = Depends(get_current_user)):
    circle = await db.circles.find_one({"circle_id": circle_id}, {"_id": 0})
    if not circle:
        raise HTTPException(status_code=404, detail="Circle not found")
    
    if circle["creator_id"] == user["user_id"]:
        raise HTTPException(status_code=400, detail="Creator cannot leave the circle")
    
    await db.circles.update_one(
        {"circle_id": circle_id},
        {"$pull": {"members": user["user_id"]}}
    )
    
    return {"message": "Left circle successfully"}

# ===================== CHAT ROUTES =====================

@api_router.post("/chat/messages")
async def send_chat_message(
    message_data: ChatMessageCreate,
    user: dict = Depends(get_current_user)
):
    """Send a message in a circle chat"""
    # Verify user is member of circle
    circle = await db.circles.find_one({"circle_id": message_data.circle_id}, {"_id": 0})
    if not circle:
        raise HTTPException(status_code=404, detail="Circle not found")
    
    if user["user_id"] not in circle.get("members", []):
        raise HTTPException(status_code=403, detail="Must be a member to send messages")
    
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    message = {
        "message_id": message_id,
        "circle_id": message_data.circle_id,
        "user_id": user["user_id"],
        "user_nickname": user.get("nickname", user.get("name", "Unknown")),
        "user_picture": user.get("picture"),
        "content": message_data.content,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.chat_messages.insert_one(message)
    
    # Return without _id
    return {
        "message_id": message_id,
        "circle_id": message_data.circle_id,
        "user_id": user["user_id"],
        "user_nickname": user.get("nickname", user.get("name", "Unknown")),
        "user_picture": user.get("picture"),
        "content": message_data.content,
        "created_at": message["created_at"]
    }

@api_router.get("/chat/messages/{circle_id}")
async def get_chat_messages(
    circle_id: str,
    limit: int = 50,
    before: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get chat messages for a circle"""
    # Verify user is member of circle
    circle = await db.circles.find_one({"circle_id": circle_id}, {"_id": 0})
    if not circle:
        raise HTTPException(status_code=404, detail="Circle not found")
    
    if user["user_id"] not in circle.get("members", []):
        raise HTTPException(status_code=403, detail="Must be a member to view messages")
    
    query = {"circle_id": circle_id}
    if before:
        query["message_id"] = {"$lt": before}
    
    messages = await db.chat_messages.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return list(reversed(messages))

# ===================== GATHERINGS ROUTES (Enhanced Meetups) =====================

@api_router.post("/gatherings")
async def create_gathering(
    gathering_data: GatheringCreate,
    user: dict = Depends(get_current_user)
):
    """Create a spiritual gathering (in-person or virtual)"""
    if user.get("subscription_status") != "premium":
        raise HTTPException(
            status_code=403,
            detail="Premium subscription required to create gatherings"
        )
    
    circle = await db.circles.find_one({"circle_id": gathering_data.circle_id}, {"_id": 0})
    if not circle:
        raise HTTPException(status_code=404, detail="Circle not found")
    
    if user["user_id"] not in circle.get("members", []):
        raise HTTPException(status_code=403, detail="Must be a member of the circle")
    
    gathering_id = f"gathering_{uuid.uuid4().hex[:12]}"
    gathering = {
        "gathering_id": gathering_id,
        "circle_id": gathering_data.circle_id,
        "circle_name": circle["name"],
        "creator_id": user["user_id"],
        "creator_name": user.get("nickname", user.get("name", "Unknown")),
        "title": gathering_data.title,
        "description": gathering_data.description,
        "gathering_type": gathering_data.gathering_type,
        "location": gathering_data.location,
        "virtual_link": gathering_data.virtual_link,
        "date": gathering_data.date,
        "attendees": [user["user_id"]],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.gatherings.insert_one(gathering)
    
    return {
        **gathering,
        "attendees_count": 1,
        "is_attending": True
    }

@api_router.get("/gatherings")
async def get_gatherings(
    request: Request,
    circle_id: Optional[str] = None,
    gathering_type: Optional[str] = None
):
    """Get gatherings, optionally filtered by circle or type"""
    user = await get_optional_user(request)
    user_id = user["user_id"] if user else None
    
    query = {}
    if circle_id:
        query["circle_id"] = circle_id
    if gathering_type:
        query["gathering_type"] = gathering_type
    
    # Only show upcoming gatherings
    query["date"] = {"$gte": datetime.now(timezone.utc)}
    
    gatherings = await db.gatherings.find(query, {"_id": 0}).sort("date", 1).to_list(50)
    
    result = []
    for g in gatherings:
        attendees = g.get("attendees", [])
        result.append({
            "gathering_id": g["gathering_id"],
            "circle_id": g["circle_id"],
            "circle_name": g.get("circle_name", "Unknown"),
            "creator_id": g["creator_id"],
            "creator_name": g.get("creator_name", "Unknown"),
            "title": g["title"],
            "description": g["description"],
            "gathering_type": g["gathering_type"],
            "location": g.get("location"),
            "virtual_link": g.get("virtual_link"),
            "date": g["date"],
            "attendees_count": len(attendees),
            "is_attending": user_id in attendees if user_id else False,
            "created_at": g["created_at"]
        })
    
    return result

@api_router.post("/gatherings/{gathering_id}/attend")
async def attend_gathering(gathering_id: str, user: dict = Depends(get_current_user)):
    """Toggle attendance for a gathering"""
    gathering = await db.gatherings.find_one({"gathering_id": gathering_id}, {"_id": 0})
    if not gathering:
        raise HTTPException(status_code=404, detail="Gathering not found")
    
    if user["user_id"] in gathering.get("attendees", []):
        await db.gatherings.update_one(
            {"gathering_id": gathering_id},
            {"$pull": {"attendees": user["user_id"]}}
        )
        return {"message": "Attendance cancelled", "attending": False}
    else:
        await db.gatherings.update_one(
            {"gathering_id": gathering_id},
            {"$addToSet": {"attendees": user["user_id"]}}
        )
        return {"message": "Attendance confirmed", "attending": True}

# ===================== LEGACY MEETUPS (for backwards compatibility) =====================

@api_router.post("/meetups")
async def create_meetup(request: Request, user: dict = Depends(get_current_user)):
    """Legacy meetup creation - redirects to gatherings"""
    body = await request.json()
    
    gathering_data = GatheringCreate(
        circle_id=body.get("circle_id"),
        title=body.get("title"),
        description=body.get("description", ""),
        gathering_type="in_person",
        location=body.get("location"),
        date=datetime.fromisoformat(body.get("date").replace("Z", "+00:00"))
    )
    
    return await create_gathering(gathering_data, user)

@api_router.get("/meetups")
async def get_meetups(request: Request, circle_id: Optional[str] = None):
    """Legacy meetups endpoint - returns in-person gatherings"""
    return await get_gatherings(request, circle_id, "in_person")

@api_router.post("/meetups/{meetup_id}/attend")
async def attend_meetup(meetup_id: str, user: dict = Depends(get_current_user)):
    """Legacy meetup attendance"""
    return await attend_gathering(meetup_id, user)

# ===================== POSTS ROUTES =====================

@api_router.post("/posts")
async def create_post(
    post_data: PostCreate,
    user: dict = Depends(get_current_user)
):
    post_id = f"post_{uuid.uuid4().hex[:12]}"
    post = {
        "post_id": post_id,
        "user_id": user["user_id"],
        "user_nickname": user.get("nickname", user.get("name", "Unknown")),
        "user_picture": user.get("picture"),
        "content": post_data.content,
        "circle_id": post_data.circle_id,
        "likes": [],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.posts.insert_one(post)
    
    return {
        "post_id": post_id,
        "user_id": user["user_id"],
        "user_nickname": post["user_nickname"],
        "user_picture": post["user_picture"],
        "content": post_data.content,
        "circle_id": post_data.circle_id,
        "likes_count": 0,
        "liked_by_user": False,
        "created_at": post["created_at"]
    }

@api_router.get("/posts")
async def get_feed(request: Request, circle_id: Optional[str] = None):
    user = await get_optional_user(request)
    user_id = user["user_id"] if user else None
    
    query = {}
    if circle_id:
        query["circle_id"] = circle_id
    else:
        query["circle_id"] = None
    
    posts = await db.posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    result = []
    for post in posts:
        likes = post.get("likes", [])
        result.append({
            "post_id": post["post_id"],
            "user_id": post["user_id"],
            "user_nickname": post.get("user_nickname", "Unknown"),
            "user_picture": post.get("user_picture"),
            "content": post["content"],
            "circle_id": post.get("circle_id"),
            "likes_count": len(likes),
            "liked_by_user": user_id in likes if user_id else False,
            "created_at": post["created_at"]
        })
    
    return result

@api_router.post("/posts/{post_id}/like")
async def like_post(post_id: str, user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if user["user_id"] in post.get("likes", []):
        await db.posts.update_one(
            {"post_id": post_id},
            {"$pull": {"likes": user["user_id"]}}
        )
        return {"message": "Unliked", "liked": False}
    else:
        await db.posts.update_one(
            {"post_id": post_id},
            {"$addToSet": {"likes": user["user_id"]}}
        )
        return {"message": "Liked", "liked": True}

# ===================== NOTIFICATIONS ROUTES =====================

@api_router.post("/notifications/schedule")
async def schedule_notification(
    notification: NotificationSchedule,
    user: dict = Depends(get_current_user)
):
    """Schedule a local notification for the user"""
    notification_id = f"notif_{uuid.uuid4().hex[:12]}"
    
    notif = {
        "notification_id": notification_id,
        "user_id": user["user_id"],
        "title": notification.title,
        "body": notification.body,
        "scheduled_time": notification.scheduled_time,
        "repeat": notification.repeat,
        "is_sent": False,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.scheduled_notifications.insert_one(notif)
    
    return {
        "notification_id": notification_id,
        "scheduled_time": notification.scheduled_time,
        "message": "Notification scheduled successfully"
    }

@api_router.get("/notifications/scheduled")
async def get_scheduled_notifications(user: dict = Depends(get_current_user)):
    """Get user's scheduled notifications"""
    notifications = await db.scheduled_notifications.find(
        {"user_id": user["user_id"], "is_sent": False},
        {"_id": 0}
    ).sort("scheduled_time", 1).to_list(50)
    
    return notifications

@api_router.delete("/notifications/{notification_id}")
async def cancel_notification(
    notification_id: str,
    user: dict = Depends(get_current_user)
):
    """Cancel a scheduled notification"""
    result = await db.scheduled_notifications.delete_one({
        "notification_id": notification_id,
        "user_id": user["user_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification cancelled"}

# ===================== USER PROFILE ROUTES =====================

@api_router.get("/users/{user_id}")
async def get_user_profile(user_id: str):
    user = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "password_hash": 0}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.put("/users/profile")
async def update_profile(
    request: Request,
    user: dict = Depends(get_current_user)
):
    body = await request.json()
    
    allowed_fields = ["nickname", "name", "picture", "spiritual_interests"]
    update_data = {k: v for k, v in body.items() if k in allowed_fields}
    
    if "nickname" in update_data:
        existing = await db.users.find_one(
            {"nickname": update_data["nickname"], "user_id": {"$ne": user["user_id"]}},
            {"_id": 0}
        )
        if existing:
            raise HTTPException(status_code=400, detail="Nickname already taken")
    
    if update_data:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0, "password_hash": 0}
    )
    
    return updated_user

# ===================== HEALTH CHECK =====================

@api_router.get("/")
async def root():
    return {"message": "Sacred Souls API", "status": "running", "version": "2.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
