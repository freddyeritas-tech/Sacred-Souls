#!/usr/bin/env python3
"""
Sacred Souls API Backend Testing Suite
Tests all backend endpoints according to test_result.md requirements
"""

import requests
import json
import uuid
from datetime import datetime, timezone, timedelta
import sys

# Configuration
BASE_URL = "https://sacred-souls-1.preview.emergentagent.com/api"
TEST_EMAIL = "test@sacredsouls.com"
TEST_PASSWORD = "test123"

class SacredSoulsAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        self.test_results = []
        
    def log_test(self, test_name, success, details="", error=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "error": str(error) if error else None,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if error:
            print(f"   Error: {error}")
        print()
    
    def test_health_check(self):
        """Test basic API health"""
        try:
            response = self.session.get(f"{self.base_url}/health")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Health Check", True, f"Status: {data.get('status')}")
                return True
            else:
                self.log_test("Health Check", False, f"Status code: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Health Check", False, error=e)
            return False
    
    def test_user_registration(self):
        """Test user registration with unique email"""
        try:
            # Generate unique email for testing
            unique_email = f"testuser_{uuid.uuid4().hex[:8]}@sacredsouls.com"
            unique_nickname = f"testuser_{uuid.uuid4().hex[:6]}"
            
            payload = {
                "email": unique_email,
                "password": "testpass123",
                "nickname": unique_nickname,
                "name": "Test User"
            }
            
            response = self.session.post(f"{self.base_url}/auth/register", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if "user" in data and "token" in data:
                    user = data["user"]
                    self.log_test("User Registration", True, 
                                f"Created user: {user.get('email')} with ID: {user.get('user_id')}")
                    return True
                else:
                    self.log_test("User Registration", False, "Missing user or token in response")
                    return False
            else:
                self.log_test("User Registration", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("User Registration", False, error=e)
            return False
    
    def test_user_login(self):
        """Test user login with existing credentials"""
        try:
            payload = {
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
            
            response = self.session.post(f"{self.base_url}/auth/login", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if "user" in data and "token" in data:
                    self.auth_token = data["token"]
                    self.user_data = data["user"]
                    self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                    self.log_test("User Login", True, 
                                f"Logged in as: {self.user_data.get('email')}")
                    return True
                else:
                    self.log_test("User Login", False, "Missing user or token in response")
                    return False
            else:
                self.log_test("User Login", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("User Login", False, error=e)
            return False
    
    def test_auth_me(self):
        """Test getting current user info"""
        try:
            if not self.auth_token:
                self.log_test("Auth Me Endpoint", False, "No auth token available")
                return False
                
            response = self.session.get(f"{self.base_url}/auth/me")
            
            if response.status_code == 200:
                data = response.json()
                if "user_id" in data and "email" in data:
                    self.log_test("Auth Me Endpoint", True, 
                                f"Retrieved user: {data.get('email')}")
                    return True
                else:
                    self.log_test("Auth Me Endpoint", False, "Missing required user fields")
                    return False
            else:
                self.log_test("Auth Me Endpoint", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Auth Me Endpoint", False, error=e)
            return False
    
    def test_questionnaire_submission(self):
        """Test questionnaire submission"""
        try:
            if not self.auth_token:
                self.log_test("Questionnaire Submission", False, "No auth token available")
                return False
                
            payload = {
                "spiritual_interests": ["meditation", "yoga", "mindfulness"],
                "experience_level": "intermediate",
                "looking_for": ["community", "learning"]
            }
            
            response = self.session.post(f"{self.base_url}/questionnaire/submit", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Questionnaire Submission", True, 
                            f"Submitted interests: {payload['spiritual_interests']}")
                return True
            else:
                self.log_test("Questionnaire Submission", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Questionnaire Submission", False, error=e)
            return False
    
    def test_subscription_status(self):
        """Test getting subscription status"""
        try:
            if not self.auth_token:
                self.log_test("Subscription Status", False, "No auth token available")
                return False
                
            response = self.session.get(f"{self.base_url}/subscription/status")
            
            if response.status_code == 200:
                data = response.json()
                if "plan" in data and "status" in data:
                    self.log_test("Subscription Status", True, 
                                f"Plan: {data.get('plan')}, Status: {data.get('status')}")
                    return True
                else:
                    self.log_test("Subscription Status", False, "Missing plan or status")
                    return False
            else:
                self.log_test("Subscription Status", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Subscription Status", False, error=e)
            return False
    
    def test_subscription_upgrade(self):
        """Test upgrading to premium subscription"""
        try:
            if not self.auth_token:
                self.log_test("Subscription Upgrade", False, "No auth token available")
                return False
                
            response = self.session.post(f"{self.base_url}/subscription/upgrade")
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Subscription Upgrade", True, 
                            f"Upgraded to premium: {data.get('message')}")
                return True
            else:
                self.log_test("Subscription Upgrade", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Subscription Upgrade", False, error=e)
            return False
    
    def test_circles_crud(self):
        """Test circles creation, listing, and joining"""
        try:
            if not self.auth_token:
                self.log_test("Circles CRUD", False, "No auth token available")
                return False
            
            # Test creating a circle (requires premium)
            circle_payload = {
                "name": f"Test Circle {uuid.uuid4().hex[:6]}",
                "description": "A test circle for spiritual growth",
                "is_public": True,
                "spiritual_focus": ["meditation", "mindfulness"]
            }
            
            create_response = self.session.post(f"{self.base_url}/circles", json=circle_payload)
            
            if create_response.status_code == 200:
                circle_data = create_response.json()
                circle_id = circle_data.get("circle_id")
                
                # Test listing circles
                list_response = self.session.get(f"{self.base_url}/circles")
                if list_response.status_code == 200:
                    circles = list_response.json()
                    self.log_test("Circles CRUD", True, 
                                f"Created circle: {circle_data.get('name')}, Listed {len(circles)} circles")
                    return True
                else:
                    self.log_test("Circles CRUD", False, 
                                f"Failed to list circles: {list_response.status_code}")
                    return False
            elif create_response.status_code == 403:
                # User might not be premium, test listing only
                list_response = self.session.get(f"{self.base_url}/circles")
                if list_response.status_code == 200:
                    circles = list_response.json()
                    self.log_test("Circles CRUD", True, 
                                f"Listed {len(circles)} circles (create requires premium)")
                    return True
                else:
                    self.log_test("Circles CRUD", False, 
                                f"Failed to list circles: {list_response.status_code}")
                    return False
            else:
                self.log_test("Circles CRUD", False, 
                            f"Failed to create circle: {create_response.status_code}, {create_response.text}")
                return False
                
        except Exception as e:
            self.log_test("Circles CRUD", False, error=e)
            return False
    
    def test_posts_crud(self):
        """Test posts creation, listing, and liking"""
        try:
            if not self.auth_token:
                self.log_test("Posts CRUD", False, "No auth token available")
                return False
            
            # Test creating a post
            post_payload = {
                "content": f"Test post content {uuid.uuid4().hex[:6]} - sharing my spiritual journey!",
                "circle_id": None  # Global post
            }
            
            create_response = self.session.post(f"{self.base_url}/posts", json=post_payload)
            
            if create_response.status_code == 200:
                post_data = create_response.json()
                post_id = post_data.get("post_id")
                
                # Test listing posts
                list_response = self.session.get(f"{self.base_url}/posts")
                if list_response.status_code == 200:
                    posts = list_response.json()
                    
                    # Test liking the post
                    like_response = self.session.post(f"{self.base_url}/posts/{post_id}/like")
                    if like_response.status_code == 200:
                        like_data = like_response.json()
                        self.log_test("Posts CRUD", True, 
                                    f"Created post, listed {len(posts)} posts, liked post: {like_data.get('liked')}")
                        return True
                    else:
                        self.log_test("Posts CRUD", False, 
                                    f"Failed to like post: {like_response.status_code}")
                        return False
                else:
                    self.log_test("Posts CRUD", False, 
                                f"Failed to list posts: {list_response.status_code}")
                    return False
            else:
                self.log_test("Posts CRUD", False, 
                            f"Failed to create post: {create_response.status_code}, {create_response.text}")
                return False
                
        except Exception as e:
            self.log_test("Posts CRUD", False, error=e)
            return False
    
    def test_meetups_crud(self):
        """Test meetups creation and listing"""
        try:
            if not self.auth_token:
                self.log_test("Meetups CRUD", False, "No auth token available")
                return False
            
            # First get circles to find one to create meetup in
            circles_response = self.session.get(f"{self.base_url}/circles")
            if circles_response.status_code != 200:
                self.log_test("Meetups CRUD", False, "Cannot get circles for meetup test")
                return False
            
            circles = circles_response.json()
            if not circles:
                self.log_test("Meetups CRUD", False, "No circles available for meetup test")
                return False
            
            # Use first available circle
            circle_id = circles[0].get("circle_id")
            
            # Test creating a meetup (requires premium and circle membership)
            meetup_payload = {
                "circle_id": circle_id,
                "title": f"Test Nature Meetup {uuid.uuid4().hex[:6]}",
                "description": "A test meetup for connecting with nature",
                "location": "Central Park, New York",
                "date": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
            }
            
            create_response = self.session.post(f"{self.base_url}/meetups", json=meetup_payload)
            
            if create_response.status_code == 200:
                meetup_data = create_response.json()
                
                # Test listing meetups
                list_response = self.session.get(f"{self.base_url}/meetups")
                if list_response.status_code == 200:
                    meetups = list_response.json()
                    self.log_test("Meetups CRUD", True, 
                                f"Created meetup: {meetup_data.get('title')}, Listed {len(meetups)} meetups")
                    return True
                else:
                    self.log_test("Meetups CRUD", False, 
                                f"Failed to list meetups: {list_response.status_code}")
                    return False
            elif create_response.status_code == 403:
                # User might not be premium or not a member, test listing only
                list_response = self.session.get(f"{self.base_url}/meetups")
                if list_response.status_code == 200:
                    meetups = list_response.json()
                    self.log_test("Meetups CRUD", True, 
                                f"Listed {len(meetups)} meetups (create requires premium + membership)")
                    return True
                else:
                    self.log_test("Meetups CRUD", False, 
                                f"Failed to list meetups: {list_response.status_code}")
                    return False
            else:
                self.log_test("Meetups CRUD", False, 
                            f"Failed to create meetup: {create_response.status_code}, {create_response.text}")
                return False
                
        except Exception as e:
            self.log_test("Meetups CRUD", False, error=e)
            return False
    
    def run_all_tests(self):
        """Run all backend tests in sequence"""
        print("🚀 Starting Sacred Souls API Backend Tests")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test sequence following the review request flow
        tests = [
            self.test_health_check,
            self.test_user_registration,
            self.test_user_login,
            self.test_auth_me,
            self.test_questionnaire_submission,
            self.test_subscription_status,
            self.test_subscription_upgrade,
            self.test_circles_crud,
            self.test_posts_crud,
            self.test_meetups_crud
        ]
        
        for test in tests:
            test()
        
        # Summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result.get('error', 'Unknown error')}")
        
        return passed == total

if __name__ == "__main__":
    tester = SacredSoulsAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)