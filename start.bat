@echo off
title Student Ranking & Result Management System (SRRMS)
echo ====================================================================
echo Starting SRRMS Full-Stack Academic Portal...
echo Database: SQLite (database.sqlite) synced with dataset.csv
echo Engine: Hash Table (M=31) + Custom Merge Sort O(n log n)
echo ====================================================================
start "" http://localhost:3000
node server.js
pause
