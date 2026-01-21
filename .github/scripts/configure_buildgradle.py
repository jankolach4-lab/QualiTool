#!/usr/bin/env python3
"""
Configure Android build.gradle with version and signing configuration.
This replaces the problematic AWK/sed approach.
"""
import sys
import re
import json
from pathlib import Path
from datetime import datetime

def main():
    if len(sys.argv) != 3:
        print("Usage: configure_buildgradle.py <package.json path> <build.gradle path>")
        sys.exit(1)
    
    package_json_path = Path(sys.argv[1])
    buildgradle_path = Path(sys.argv[2])
    
    # Read version from package.json
    with open(package_json_path) as f:
        package_data = json.load(f)
        version_name = package_data['version']
    
    # Generate versionCode with minute precision
    version_code = datetime.now().strftime('%Y%m%d%H%M')
    
    print(f"📦 Configuring build.gradle:")
    print(f"   versionName: {version_name}")
    print(f"   versionCode: {version_code}")
    
    # Read build.gradle
    with open(buildgradle_path, 'r') as f:
        content = f.read()
    
    # Replace versionCode
    content = re.sub(r'versionCode\s+\d+', f'versionCode {version_code}', content)
    
    # Replace versionName
    content = re.sub(r'versionName\s+"[^"]*"', f'versionName "{version_name}"', content)
    
    # Add signing config if not present
    if 'signingConfigs {' not in content:
        signing_config = '''
    signingConfigs {
        release {
            def keystorePropertiesFile = rootProject.file("keystore.properties")
            if (keystorePropertiesFile.exists()) {
                def keystoreProperties = new Properties()
                keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
                storeFile file(keystoreProperties["storeFile"])
                storePassword keystoreProperties["storePassword"]
                keyAlias keystoreProperties["keyAlias"]
                keyPassword keystoreProperties["keyPassword"]
            }
        }
    }
'''
        # Insert after 'android {' line
        content = re.sub(r'(android\s*\{)', r'\1' + signing_config, content, count=1)
    
    # Add signingConfig to release buildType if not present
    if 'signingConfig signingConfigs.release' not in content:
        # Find the release { block and add signingConfig
        content = re.sub(
            r'(release\s*\{)',
            r'\1\n            signingConfig signingConfigs.release',
            content,
            count=1
        )
    
    # Write back
    with open(buildgradle_path, 'w') as f:
        f.write(content)
    
    print("✅ build.gradle configured successfully")
    
    # Verify
    print("\n📋 Verification:")
    with open(buildgradle_path, 'r') as f:
        for line in f:
            if 'versionCode' in line or 'versionName' in line:
                print(f"   {line.strip()}")

if __name__ == '__main__':
    main()
