// PM2 process config. Run from the project root: `pm2 start ecosystem.config.cjs`.
// Uses .cjs (not .js) because package.json has "type": "module" — pm2's plain
// `module.exports` config needs CommonJS regardless of that setting.
module.exports = {
  apps: [
    {
      name: "cumplimiento",
      script: "node_modules/vinext/dist/cli.js",
      args: "start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
