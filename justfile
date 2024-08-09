deploy:
  rm -rf static/*
  cd frontend && npm run build
  mv frontend/dist/* static
  cargo build --release
  scp target/release/um-device-tracker nestor@$UAM_PROJECTS_VPS_IP:um-device-tracker
  scp -r static nestor@$UAM_PROJECTS_VPS_IP:um-device-tracker
  
