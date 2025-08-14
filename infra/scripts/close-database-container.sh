#!/bin/bash

close() {
  npm run services:stop
}

trap close SIGINT SIGTERM

eval $1
close