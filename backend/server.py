from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'sacred-souls-secret-key-2025')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7

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

# Spiritual interests categories
SPIRITUAL_INTERESTS = [
    "meditation",
    "yoga",
    "astrology",
    "tarot",
    "shamanism",
    "nature_spirituality",
    "buddhism",
    "hinduism",
    "energy_healing",
    "reiki",
    "crystals",
    "mindfulness",
    "breathwork",
    "sound_healing"
]

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    nickname: str
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    nickname: str
    name: Optional[str] = None
    picture: Optional[str] = None
    spiritual_interests: List[str] = []
    subscription_status: str = "free"
    has_completed_questionnaire: bool = False
    created_at: datetime

class QuestionnaireSubmit(BaseModel):
    spiritual_interests: List[str]
    experience_level: str  # beginner, intermediate, advanced
    looking_for: List[str]  # community, learning, events, healing

class CircleCreate(BaseModel):
    name: str
    description: str
    is_public: bool = True
    spiritual_focus: List[str] = []

class CircleResponse(BaseModel):
    circle_id: str
    name: str
    description: str
    creator_id: str
    creator_name: str
    members_count: int
    is_public: bool
    spiritual_focus: List[str]
    created_at: datetime
    is_member: bool = False

class PostCreate(BaseModel):
    content: str
    circle_id: Optional[str] = None

class PostResponse(BaseModel):
    post_id: str
    user_id: str
    user_nickname: str
    user_picture: Optional[str] = None
    content: str
    circle_id: Optional[str] = None
    likes_count: int = 0
    liked_by_user: bool = False
    created_at: datetime

class MeetupCreate(BaseModel):
    circle_id: str
    title: str
    description: str
    location: str
    date: datetime

class MeetupResponse(BaseModel):
    meetup_id: str
    circle_id: str
    circle_name: str
    creator_id: str
    creator_name: str
    title: str
    description: str
    location: str
    date: datetime
    attendees_count: int
    is_attending: bool = False
    created_at: datetime

class SubscriptionResponse(BaseModel):
    user_id: str
    plan: str  # free, premium
    status: str  # active, cancelled, expired
    price: float = 0.0
    expires_at: Optional[datetime] = None

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
    # Check cookie first
    token = request.cookies.get("session_token")
    
    # Then check Authorization header
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if it's a JWT token or session token
    user_id = verify_jwt_token(token)
    
    if not user_id:
        # Check session in database (for Google OAuth)
        session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if not session:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        # Check expiry
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
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if nickname exists
    existing_nickname = await db.users.find_one({"nickname": user_data.nickname}, {"_id": 0})
    if existing_nickname:
        raise HTTPException(status_code=400, detail="Nickname already taken")
    
    # Hash password
    password_hash = bcrypt.hashpw(user_data.password.encode(), bcrypt.gensalt()).decode()
    
    # Create user
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
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(user)
    
    # Create JWT token
    token = create_jwt_token(user_id)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60
    )
    
    # Get user without _id and password_hash
    user_data = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    
    return {"user": user_data, "token": token}

@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check password
    if not bcrypt.checkpw(credentials.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create JWT token
    token = create_jwt_token(user["user_id"])
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60
    )
    
    # Get user without password
    user_data = {k: v for k, v in user.items() if k != "password_hash"}
    
    return {"user": user_data, "token": token}

@api_router.post("/auth/google-session")
async def process_google_session(request: Request, response: Response):
    """Process Google OAuth session_id from Emergent Auth"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth to get user data
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
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
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        nickname = email.split("@")[0]
        
        # Ensure unique nickname
        counter = 1
        base_nickname = nickname
        while await db.users.find_one({"nickname": nickname}, {"_id": 0}):
            nickname = f"{base_nickname}{counter}"
            counter += 1
        
        user = {
            "user_id": user_id,
            "email": email,
            "password_hash": None,  # OAuth users don't have password
            "nickname": nickname,
            "name": name,
            "picture": picture,
            "spiritual_interests": [],
            "subscription_status": "free",
            "has_completed_questionnaire": False,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(user)
    
    # Store session token
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    # Get updated user
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
    # Update user profile
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {
                "spiritual_interests": data.spiritual_interests,
                "has_completed_questionnaire": True
            }
        }
    )
    
    # Store questionnaire response
    await db.questionnaire_responses.insert_one({
        "user_id": user["user_id"],
        "spiritual_interests": data.spiritual_interests,
        "experience_level": data.experience_level,
        "looking_for": data.looking_for,
        "submitted_at": datetime.now(timezone.utc)
    })
    
    return {"message": "Questionnaire submitted successfully"}

# ===================== SUBSCRIPTION ROUTES =====================

@api_router.get("/subscription/status", response_model=SubscriptionResponse)
async def get_subscription_status(user: dict = Depends(get_current_user)):
    subscription = await db.subscriptions.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not subscription:
        return SubscriptionResponse(
            user_id=user["user_id"],
            plan="free",
            status="active",
            price=0.0
        )
    
    return SubscriptionResponse(**subscription)

@api_router.post("/subscription/upgrade")
async def upgrade_subscription(user: dict = Depends(get_current_user)):
    """Upgrade to premium (€10/month) - In production, integrate with Stripe"""
    
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

@api_router.post("/circles", response_model=CircleResponse)
async def create_circle(
    circle_data: CircleCreate,
    user: dict = Depends(get_current_user)
):
    # Check if user is premium
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
    
    return CircleResponse(
        circle_id=circle_id,
        name=circle_data.name,
        description=circle_data.description,
        creator_id=user["user_id"],
        creator_name=user.get("nickname", user.get("name", "Unknown")),
        members_count=1,
        is_public=circle_data.is_public,
        spiritual_focus=circle_data.spiritual_focus,
        created_at=circle["created_at"],
        is_member=True
    )

@api_router.get("/circles", response_model=List[CircleResponse])
async def get_circles(request: Request):
    user = await get_optional_user(request)
    user_id = user["user_id"] if user else None
    
    circles = await db.circles.find({"is_public": True}, {"_id": 0}).to_list(100)
    
    result = []
    for circle in circles:
        members = circle.get("members", [])
        result.append(CircleResponse(
            circle_id=circle["circle_id"],
            name=circle["name"],
            description=circle["description"],
            creator_id=circle["creator_id"],
            creator_name=circle.get("creator_name", "Unknown"),
            members_count=len(members),
            is_public=circle["is_public"],
            spiritual_focus=circle.get("spiritual_focus", []),
            created_at=circle["created_at"],
            is_member=user_id in members if user_id else False
        ))
    
    return result

@api_router.get("/circles/my", response_model=List[CircleResponse])
async def get_my_circles(user: dict = Depends(get_current_user)):
    circles = await db.circles.find(
        {"members": user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    
    result = []
    for circle in circles:
        members = circle.get("members", [])
        result.append(CircleResponse(
            circle_id=circle["circle_id"],
            name=circle["name"],
            description=circle["description"],
            creator_id=circle["creator_id"],
            creator_name=circle.get("creator_name", "Unknown"),
            members_count=len(members),
            is_public=circle["is_public"],
            spiritual_focus=circle.get("spiritual_focus", []),
            created_at=circle["created_at"],
            is_member=True
        ))
    
    return result

@api_router.get("/circles/{circle_id}", response_model=CircleResponse)
async def get_circle(circle_id: str, request: Request):
    user = await get_optional_user(request)
    user_id = user["user_id"] if user else None
    
    circle = await db.circles.find_one({"circle_id": circle_id}, {"_id": 0})
    if not circle:
        raise HTTPException(status_code=404, detail="Circle not found")
    
    members = circle.get("members", [])
    return CircleResponse(
        circle_id=circle["circle_id"],
        name=circle["name"],
        description=circle["description"],
        creator_id=circle["creator_id"],
        creator_name=circle.get("creator_name", "Unknown"),
        members_count=len(members),
        is_public=circle["is_public"],
        spiritual_focus=circle.get("spiritual_focus", []),
        created_at=circle["created_at"],
        is_member=user_id in members if user_id else False
    )

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

# ===================== POSTS ROUTES =====================

@api_router.post("/posts", response_model=PostResponse)
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
    
    return PostResponse(
        post_id=post_id,
        user_id=user["user_id"],
        user_nickname=post["user_nickname"],
        user_picture=post["user_picture"],
        content=post_data.content,
        circle_id=post_data.circle_id,
        likes_count=0,
        liked_by_user=False,
        created_at=post["created_at"]
    )

@api_router.get("/posts", response_model=List[PostResponse])
async def get_feed(request: Request, circle_id: Optional[str] = None):
    user = await get_optional_user(request)
    user_id = user["user_id"] if user else None
    
    query = {}
    if circle_id:
        query["circle_id"] = circle_id
    else:
        query["circle_id"] = None  # Only global posts
    
    posts = await db.posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    result = []
    for post in posts:
        likes = post.get("likes", [])
        result.append(PostResponse(
            post_id=post["post_id"],
            user_id=post["user_id"],
            user_nickname=post.get("user_nickname", "Unknown"),
            user_picture=post.get("user_picture"),
            content=post["content"],
            circle_id=post.get("circle_id"),
            likes_count=len(likes),
            liked_by_user=user_id in likes if user_id else False,
            created_at=post["created_at"]
        ))
    
    return result

@api_router.post("/posts/{post_id}/like")
async def like_post(post_id: str, user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if user["user_id"] in post.get("likes", []):
        # Unlike
        await db.posts.update_one(
            {"post_id": post_id},
            {"$pull": {"likes": user["user_id"]}}
        )
        return {"message": "Unliked", "liked": False}
    else:
        # Like
        await db.posts.update_one(
            {"post_id": post_id},
            {"$addToSet": {"likes": user["user_id"]}}
        )
        return {"message": "Liked", "liked": True}

# ===================== MEETUPS ROUTES =====================

@api_router.post("/meetups", response_model=MeetupResponse)
async def create_meetup(
    meetup_data: MeetupCreate,
    user: dict = Depends(get_current_user)
):
    # Check if user is premium
    if user.get("subscription_status") != "premium":
        raise HTTPException(
            status_code=403,
            detail="Premium subscription required to create meetups"
        )
    
    # Check if user is member of the circle
    circle = await db.circles.find_one({"circle_id": meetup_data.circle_id}, {"_id": 0})
    if not circle:
        raise HTTPException(status_code=404, detail="Circle not found")
    
    if user["user_id"] not in circle.get("members", []):
        raise HTTPException(status_code=403, detail="Must be a member of the circle")
    
    meetup_id = f"meetup_{uuid.uuid4().hex[:12]}"
    meetup = {
        "meetup_id": meetup_id,
        "circle_id": meetup_data.circle_id,
        "circle_name": circle["name"],
        "creator_id": user["user_id"],
        "creator_name": user.get("nickname", user.get("name", "Unknown")),
        "title": meetup_data.title,
        "description": meetup_data.description,
        "location": meetup_data.location,
        "date": meetup_data.date,
        "attendees": [user["user_id"]],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.meetups.insert_one(meetup)
    
    return MeetupResponse(
        meetup_id=meetup_id,
        circle_id=meetup_data.circle_id,
        circle_name=circle["name"],
        creator_id=user["user_id"],
        creator_name=meetup["creator_name"],
        title=meetup_data.title,
        description=meetup_data.description,
        location=meetup_data.location,
        date=meetup_data.date,
        attendees_count=1,
        is_attending=True,
        created_at=meetup["created_at"]
    )

@api_router.get("/meetups", response_model=List[MeetupResponse])
async def get_meetups(request: Request, circle_id: Optional[str] = None):
    user = await get_optional_user(request)
    user_id = user["user_id"] if user else None
    
    query = {}
    if circle_id:
        query["circle_id"] = circle_id
    
    meetups = await db.meetups.find(query, {"_id": 0}).sort("date", 1).to_list(50)
    
    result = []
    for meetup in meetups:
        attendees = meetup.get("attendees", [])
        result.append(MeetupResponse(
            meetup_id=meetup["meetup_id"],
            circle_id=meetup["circle_id"],
            circle_name=meetup.get("circle_name", "Unknown"),
            creator_id=meetup["creator_id"],
            creator_name=meetup.get("creator_name", "Unknown"),
            title=meetup["title"],
            description=meetup["description"],
            location=meetup["location"],
            date=meetup["date"],
            attendees_count=len(attendees),
            is_attending=user_id in attendees if user_id else False,
            created_at=meetup["created_at"]
        ))
    
    return result

@api_router.post("/meetups/{meetup_id}/attend")
async def attend_meetup(meetup_id: str, user: dict = Depends(get_current_user)):
    meetup = await db.meetups.find_one({"meetup_id": meetup_id}, {"_id": 0})
    if not meetup:
        raise HTTPException(status_code=404, detail="Meetup not found")
    
    if user["user_id"] in meetup.get("attendees", []):
        # Cancel attendance
        await db.meetups.update_one(
            {"meetup_id": meetup_id},
            {"$pull": {"attendees": user["user_id"]}}
        )
        return {"message": "Attendance cancelled", "attending": False}
    else:
        # Attend
        await db.meetups.update_one(
            {"meetup_id": meetup_id},
            {"$addToSet": {"attendees": user["user_id"]}}
        )
        return {"message": "Attendance confirmed", "attending": True}

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
    return {"message": "Sacred Souls API", "status": "running"}

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
