const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec(`
    cd /var/www/playpetal &&
    git stash &&
    git pull origin main &&
    echo "Building backend..." &&
    cd backend &&
    npm install && 
    echo "PORT=5055" > .env &&
    echo "DATABASE_URL=\\"postgresql://postgres:root@127.0.0.1:5432/kids_ecommerce?schema=public\\"" >> .env &&
    echo "GOOGLE_CLIENT_ID=584727655941-8gac3t261lsnr665kphnlunnkuuf6ndg.apps.googleusercontent.com" >> .env &&
    chmod +x node_modules/.bin/prisma &&
    npx prisma generate &&
    npx prisma db push --accept-data-loss &&
    npx prisma db push --accept-data-loss &&
    chmod +x node_modules/.bin/tsc &&
    ./node_modules/.bin/tsc &&
    pm2 restart playpetal-backend --update-env || pm2 restart 14 --update-env &&
    
    echo "Building admin..." &&
    cd ../admin && 
    npm install && 
    echo "VITE_API_URL=/api" > .env &&
    npm run build &&
    
    echo "Building frontend..." &&
    cd ../frontend && 
    npm install && 
    echo "NEXT_PUBLIC_API_URL=https://playpetal.technobuzzsystems.com/api" > .env.production &&
    npm run build &&
    pm2 restart playpetal-frontend || pm2 restart 15 &&
    
    echo "All systems fully rebuilt and updated!"
  `, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: '31.97.224.143',
  port: 22,
  username: 'root',
  password: 'SystemTech@2026'
});
