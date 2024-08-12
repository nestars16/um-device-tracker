deploy:
  rm -rf static/*
  cd frontend && npm run build
  mv frontend/dist/* static
  cargo build --release
  scp target/release/um-device-tracker nestor@$SERVER_IP:um-device-tracker
  scp -r static nestor@$SERVER_IP:um-device-tracker
  scp .env nestor@$SERVER_IP:um-device-tracker

update-assets:
  rm -rf static/*
  cd frontend && npm run build
  mv frontend/dist/* static


  
