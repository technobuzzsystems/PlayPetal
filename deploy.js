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
    echo "DATABASE_URL=\\"postgresql://postgres:root@localhost:5432/kids_ecommerce?schema=public\\"" >> .env &&
    npx prisma generate &&
    npx prisma migrate deploy &&
    chmod +x node_modules/.bin/tsc &&
    ./node_modules/.bin/tsc &&
    pm2 restart playpetal-backend || pm2 restart 14 &&
    
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
