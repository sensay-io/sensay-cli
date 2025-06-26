#!/bin/sh

set -o xtrace

./claudebox profile javascript
./claudebox install gh
./claudebox update

./claudebox save --enable-sudo --disable-firewall
