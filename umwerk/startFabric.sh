#!/bin/bash
set -e
set -x

export MSYS_NO_PATHCONV=1

LANGUAGE=node
NAME=umwerkchaincode
CC_SRC_PATH=/opt/gopath/src/github.com/umwerk
VERSION=${1:-"1.0"}

rm -rf ./hfc-key-store

cd ../basic-network
./start.sh

docker-compose -f ./docker-compose.yml up -d cli

docker exec -e "CORE_PEER_LOCALMSPID=Org1MSP" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp" cli peer chaincode install -n $NAME -v $VERSION -p "$CC_SRC_PATH" -l "$LANGUAGE"
docker exec -e "CORE_PEER_LOCALMSPID=Org1MSP" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp" cli peer chaincode instantiate -o orderer.example.com:7050 -C mychannel -n $NAME -l "$LANGUAGE" -v $VERSION -c '{"Args":[""]}' -P "OR ('Org1MSP.member','Org2MSP.member')"

docker logs -f dev-peer0.org1.example.com-$NAME-$VERSION
