#!/bin/bash

cd ../frontend
npm i --verbose

cd ../backend
python -m script.create_db
python -m script.create_test_db
python -m script.reset_dev
