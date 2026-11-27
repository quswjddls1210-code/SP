import { spawn } from 'node:child_process';

const processes = [
  spawn(process.execPath, ['--watch', 'server.js'], { stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1'], { stdio: 'inherit' }),
];

function stop() {
  for (const child of processes) child.kill();
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
for (const child of processes) {
  child.on('exit', (code) => {
    stop();
    process.exit(code || 0);
  });
}
