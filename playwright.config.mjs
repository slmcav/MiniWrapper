import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir:'./tests',
  testMatch:'**/*.spec.mjs',
  timeout:60000,
  fullyParallel:false,
  reporter:process.env.CI ? [['list'],['html',{outputFolder:'playwright-report',open:'never'}]] : 'list',
  use:{
    ...devices['Desktop Chrome'],
    viewport:{width:390,height:844},
    isMobile:true,
    hasTouch:true,
    baseURL:'http://127.0.0.1:4173',
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
    launchOptions:{
      args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox']
    }
  },
  projects:[{name:'chromium-mobile',use:{browserName:'chromium'}}],
  webServer:{command:'node tests/serve.mjs',url:'http://127.0.0.1:4173/index.html',reuseExistingServer:!process.env.CI,timeout:30000}
});
