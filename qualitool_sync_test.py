#!/usr/bin/env python3
"""
QualiTool Contact Synchronization Test
Tests the complete contact sync flow from frontend to Supabase database
"""

import requests
import time
import json
import sys
from datetime import datetime
from supabase import create_client, Client

class QualiToolSyncTester:
    def __init__(self):
        # Supabase configuration from the review request
        self.supabase_url = "https://whigasnqcvjkilkmbfld.supabase.co"
        self.supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoaWdhc25xY3Zqa2lsa21iZmxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyNDE1OTIsImV4cCI6MjA2OTgxNzU5Mn0.tfUnIP_oWy3N9UM6Ws9mPiKqsGtj8_kIOMW42E298rc"
        
        # Test user credentials from review request
        self.test_email = "final-test-1768897047@example.com"
        self.test_password = "TestPassword123!"
        self.expected_user_id = "bb133f28-393e-4241-968f-8f9f0e3473a5"
        
        # Test contact data from review request
        self.test_contact = {
            "strasse": "Sync Test Straße",
            "hausnummer": "999", 
            "ort": "Teststadt",
            "we": "5",
            "status": "offen"
        }
        
        # Initialize Supabase client
        try:
            self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
            print("✅ Supabase client initialized successfully")
        except Exception as e:
            print(f"❌ Failed to initialize Supabase client: {e}")
            sys.exit(1)
            
        self.tests_run = 0
        self.tests_passed = 0

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
            if details:
                print(f"   {details}")
        else:
            print(f"❌ {name}")
            if details:
                print(f"   {details}")

    def test_supabase_connection(self):
        """Test basic Supabase connection"""
        try:
            # Try to access the user_contacts table
            response = self.supabase.table('user_contacts').select('user_id').limit(1).execute()
            self.log_test("Supabase Connection", True, f"Connected successfully, can access user_contacts table")
            return True
        except Exception as e:
            self.log_test("Supabase Connection", False, f"Connection failed: {e}")
            return False

    def test_user_authentication(self):
        """Test user authentication with provided credentials"""
        try:
            # Sign in with test credentials
            auth_response = self.supabase.auth.sign_in_with_password({
                "email": self.test_email,
                "password": self.test_password
            })
            
            if auth_response.user and auth_response.user.id:
                actual_user_id = auth_response.user.id
                if actual_user_id == self.expected_user_id:
                    self.log_test("User Authentication", True, 
                                f"Successfully authenticated user {self.test_email}, ID matches: {actual_user_id}")
                    return True, actual_user_id
                else:
                    self.log_test("User Authentication", False, 
                                f"User ID mismatch. Expected: {self.expected_user_id}, Got: {actual_user_id}")
                    return False, actual_user_id
            else:
                self.log_test("User Authentication", False, "Authentication failed - no user returned")
                return False, None
                
        except Exception as e:
            self.log_test("User Authentication", False, f"Authentication error: {e}")
            return False, None

    def test_user_contacts_table_access(self, user_id):
        """Test access to user_contacts table for the authenticated user"""
        try:
            # Check if user has a row in user_contacts table
            response = self.supabase.table('user_contacts').select('*').eq('user_id', user_id).execute()
            
            if response.data:
                existing_contacts = response.data[0].get('contacts', []) if response.data else []
                self.log_test("User Contacts Table Access", True, 
                            f"Found user_contacts row for user {user_id}, existing contacts: {len(existing_contacts)}")
                return True, existing_contacts
            else:
                # Try to create the user row if it doesn't exist
                insert_response = self.supabase.table('user_contacts').insert({
                    'user_id': user_id,
                    'contacts': []
                }).execute()
                
                if insert_response.data:
                    self.log_test("User Contacts Table Access", True, 
                                f"Created new user_contacts row for user {user_id}")
                    return True, []
                else:
                    self.log_test("User Contacts Table Access", False, 
                                f"Could not access or create user_contacts row")
                    return False, []
                    
        except Exception as e:
            self.log_test("User Contacts Table Access", False, f"Table access error: {e}")
            return False, []

    def test_contact_sync_simulation(self, user_id, existing_contacts):
        """Simulate adding a contact and syncing to Supabase"""
        try:
            # Create a unique contact to avoid conflicts
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            test_contact = self.test_contact.copy()
            test_contact['id'] = f"sync_test_{timestamp}"
            test_contact['created_at'] = datetime.now().isoformat()
            
            # Add the test contact to existing contacts
            updated_contacts = existing_contacts.copy()
            updated_contacts.append(test_contact)
            
            print(f"🔄 Simulating contact sync for user {user_id}")
            print(f"   Adding contact: {test_contact['strasse']} {test_contact['hausnummer']}, {test_contact['ort']}")
            
            # Method 1: Try RPC function first (as the app does)
            try:
                rpc_response = self.supabase.rpc('fn_public_upsert_user_contacts', {
                    'p_user_id': user_id,
                    'p_contacts': updated_contacts
                }).execute()
                
                self.log_test("Contact Sync via RPC", True, 
                            f"Successfully synced {len(updated_contacts)} contacts via RPC")
                sync_method = "RPC"
                
            except Exception as rpc_error:
                print(f"   RPC method failed: {rpc_error}")
                
                # Method 2: Fallback to direct table upsert (as the app does)
                try:
                    upsert_response = self.supabase.table('user_contacts').upsert({
                        'user_id': user_id,
                        'contacts': updated_contacts
                    }, on_conflict='user_id').execute()
                    
                    self.log_test("Contact Sync via Table Upsert", True, 
                                f"Successfully synced {len(updated_contacts)} contacts via table upsert")
                    sync_method = "Table Upsert"
                    
                except Exception as upsert_error:
                    self.log_test("Contact Sync", False, 
                                f"Both RPC and table upsert failed. RPC: {rpc_error}, Upsert: {upsert_error}")
                    return False, None
            
            return True, test_contact
            
        except Exception as e:
            self.log_test("Contact Sync Simulation", False, f"Sync simulation error: {e}")
            return False, None

    def test_contact_verification(self, user_id, test_contact, wait_seconds=10):
        """Verify the contact appears in the database after sync"""
        try:
            print(f"⏳ Waiting {wait_seconds} seconds for sync to complete...")
            time.sleep(wait_seconds)
            
            # Query the database to verify the contact was synced
            response = self.supabase.table('user_contacts').select('contacts').eq('user_id', user_id).execute()
            
            if response.data and len(response.data) > 0:
                synced_contacts = response.data[0].get('contacts', [])
                
                # Look for our test contact
                test_contact_found = False
                for contact in synced_contacts:
                    if (contact.get('strasse') == test_contact['strasse'] and 
                        contact.get('hausnummer') == test_contact['hausnummer'] and
                        contact.get('ort') == test_contact['ort']):
                        test_contact_found = True
                        break
                
                if test_contact_found:
                    self.log_test("Contact Verification", True, 
                                f"Test contact found in database! Total contacts: {len(synced_contacts)}")
                    return True
                else:
                    self.log_test("Contact Verification", False, 
                                f"Test contact NOT found in database. Total contacts: {len(synced_contacts)}")
                    print(f"   Looking for: {test_contact['strasse']} {test_contact['hausnummer']}, {test_contact['ort']}")
                    contact_list = [f"{c.get('strasse', 'N/A')} {c.get('hausnummer', 'N/A')}, {c.get('ort', 'N/A')}" for c in synced_contacts[:3]]
                    print(f"   Found contacts: {contact_list}")
                    return False
            else:
                self.log_test("Contact Verification", False, "No contacts found in database")
                return False
                
        except Exception as e:
            self.log_test("Contact Verification", False, f"Verification error: {e}")
            return False

    def test_rpc_function_availability(self):
        """Test if the RPC function fn_public_upsert_user_contacts is available"""
        try:
            # Try calling the RPC with minimal data to test availability
            response = self.supabase.rpc('fn_public_upsert_user_contacts', {
                'p_user_id': self.expected_user_id,
                'p_contacts': []
            }).execute()
            
            self.log_test("RPC Function Availability", True, 
                        "fn_public_upsert_user_contacts is available and callable")
            return True
            
        except Exception as e:
            error_msg = str(e).lower()
            if 'does not exist' in error_msg or 'function' in error_msg:
                self.log_test("RPC Function Availability", False, 
                            f"RPC function fn_public_upsert_user_contacts does not exist: {e}")
            else:
                self.log_test("RPC Function Availability", False, 
                            f"RPC function error (may still exist): {e}")
            return False

    def run_full_sync_test(self):
        """Run the complete contact synchronization test flow"""
        print("🚀 Starting QualiTool Contact Synchronization Test")
        print("=" * 60)
        
        # Test 1: Basic Supabase connection
        if not self.test_supabase_connection():
            print("❌ Cannot proceed without Supabase connection")
            return False
        
        # Test 2: RPC function availability
        self.test_rpc_function_availability()
        
        # Test 3: User authentication
        auth_success, user_id = self.test_user_authentication()
        if not auth_success:
            print("❌ Cannot proceed without user authentication")
            return False
        
        # Test 4: User contacts table access
        table_success, existing_contacts = self.test_user_contacts_table_access(user_id)
        if not table_success:
            print("❌ Cannot proceed without table access")
            return False
        
        # Test 5: Contact sync simulation
        sync_success, test_contact = self.test_contact_sync_simulation(user_id, existing_contacts)
        if not sync_success:
            print("❌ Contact sync failed")
            return False
        
        # Test 6: Contact verification
        verification_success = self.test_contact_verification(user_id, test_contact)
        
        # Print final results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("✅ ALL TESTS PASSED - Contact synchronization is working!")
            return True
        else:
            print("❌ SOME TESTS FAILED - Contact synchronization has issues")
            return False

def main():
    """Main test execution"""
    try:
        tester = QualiToolSyncTester()
        success = tester.run_full_sync_test()
        return 0 if success else 1
    except Exception as e:
        print(f"❌ Test execution failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())