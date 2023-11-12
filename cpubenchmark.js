const os = require("os");
const si = require("systeminformation");
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

function runBenchmark(load) {
  const startTime = performance.now();

  // Perform a computation-intensive task
  for (let i = 0; i < load; i++) {
    Math.sqrt(Math.random());
  }

  const endTime = performance.now();
  const elapsedTime = endTime - startTime;

  // The higher the points, the better the CPU performance
  const benchmarkPoints = load / elapsedTime;

  return benchmarkPoints;
}

async function showSystemInfo() {
  try {
    console.log(`Running on ${os.platform}, ${os.arch}.`);

    const cpuData = await si.cpu();
    console.log(`CPU: ${formatStr(cpuData.brand + ' ' + cpuData.vendor, '','unknown processor') } at ${formatStr(cpuData.speed,'Ghz', 'unknown speed')}, ${formatStr(cpuData.physicalCores, 'c','unknown cores count')}/${formatStr(cpuData.cores, 't','unknown logical cores count')}`);

    const memData = await si.memLayout();
    for (let i = 0; i < memData.length; i++)
      console.log(`Memory [slot${i}]: ${formatStr(memData[i].manufacturer, '','unknown memory')} at ${formatStr(memData[i].clockSpeed, 'Mhz', 'unknown speed')}, ${formatStr(memData[i].size, 'bytes', 'unknown size')} in ${formatStr(memData[i].type, '', 'unknown type')}`);
  } catch (error) {
    console.error('Error getting system information:', error);
  }
}

function formatStr(str, strToConcat,errorMsg){
  return str ? str+strToConcat : errorMsg
}

async function main() {
  if (isMainThread) {
    const numThreads = os.cpus().length; // Number of CPU threads
    const pointsPerThread = 1e9; // Defines the workload to perform
    console.log(`Benchmark started at ${new Date().toLocaleTimeString()}`)
    await showSystemInfo();

    const workers = [];
    const results = [];

    for (let i = 0; i < numThreads; i++) {
      const worker = new Worker(__filename, {
        workerData: { points: pointsPerThread },
      });

      worker.on('message', (message) => {
        const roundedPoints = message.toFixed(2);
        console.log(`Thread #${i + 1} finished, ${roundedPoints} pts`);
        results.push({thread: i + 1, points: roundedPoints})

        if(results.length === numThreads){
          const bestThread = results.reduce((best, current) => (parseFloat(current.points) > parseFloat(best.points) ? current : best), results[0]);
          const multiThreadPerfomance = results.reduce((sum, current) => sum + parseFloat(current.points), 0) 

          console.log(`Single Thread Result (best): ${bestThread.points}pts`)
          console.log(`MultiThread Result: ${multiThreadPerfomance.toFixed(2)}pts`)
          console.log(`Benchmark finished at ${new Date().toLocaleTimeString()}`)
        }
      });

      workers.push(worker);
    }

    for (const worker of workers) {
      worker.postMessage('start');
    }
  } else {
    // Worker thread
    parentPort.once('message', (message) => {
      if (message === 'start') {
        const result = runBenchmark(workerData.points);
        parentPort.postMessage(result);
      }
    });
  }
  
}

// Call the main function to start the execution
main();
