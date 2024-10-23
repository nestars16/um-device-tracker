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

clean:
  rm -rf static/*
  rm -rf frontend/dist


docker-deploy:
  docker build --build-arg DATABASE_URL=$DATABASE_URL -t us-east1-docker.pkg.dev/miscellaneous-429614/misc/um-device-tracker .
  docker push us-east1-docker.pkg.dev/miscellaneous-429614/misc/um-device-tracker

  
