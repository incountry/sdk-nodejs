#!/usr/bin/env sh

# common variables
API_KEY=$1
API_URL=$2
VERSION=`cat sonar-project.properties | grep -Po '(?<=sonar.projectVersion=).*'`
PROJECT_NAME=$3
PROJECT_ID=`curl -s -X "GET" "${API_URL}/api/v1/project" \
     -H 'Content-Type: application/json' \
     -H "X-API-Key: ${API_KEY}" | jq -j ".[]?
                  | select(.version == \"${VERSION}\" and .name == \"${PROJECT_NAME}\")
                  | .uuid"`

[ -z "${VERSION}" ] && VERSION="1.0.0"

echo "Uploading BOM for project ${PROJECT_NAME} version ${VERSION}"

if [ -z "${PROJECT_ID}" ]; then
  echo "Adding project ${PROJECT_NAME} with ${VERSION} to Dependency-Track"
  PROJECT_ID=`curl -s -X "PUT" "${API_URL}/api/v1/project" \
     -H 'Content-Type: application/json' \
     -H "X-API-Key: ${API_KEY}" \
     -d "{
       \"name\": \"${PROJECT_NAME}\",
       \"version\": \"${VERSION}\"
     }" | jq -j '.uuid'`
fi

[ -z "${PROJECT_ID}" ] && echo "Can't create project ${PROJECT_NAME} with version ${VERSION}" && exit 1

# generate bom.xml
cyclonedx-bom -o bom.xml

echo "Adding BOM for PROJECT with ID ${PROJECT_ID}..."

printf "{ \"project\": \"${PROJECT_ID}\", \"bom\": \"" > payload.json
base64 -w0 bom.xml >> payload.json 
printf "\" }\n" >> payload.json

RESULT=`curl -s -X "PUT" "${API_URL}/api/v1/bom" \
     -H 'Content-Type: application/json' \
     -H "X-API-Key: ${API_KEY}" \
     -d @payload.json \
     -o /dev/null -w "%{http_code}"`

echo "Result code is ${RESULT}"
[ "$RESULT" = "200" ] || (echo "Can't post BOM to Dependency-Track" && exit 1)
