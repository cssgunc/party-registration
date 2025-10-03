#!/bin/bash

cd ../frontend
npm ci --verbose

cd ../backend/src/
python -m script.create_db
python -m script.reset_dev