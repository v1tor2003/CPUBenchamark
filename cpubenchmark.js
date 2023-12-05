import os from 'os'
import si from 'systeminformation'
import {Worker, isMainThread, parentPort, workerData} from 'worker_threads'

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

    console.log(`CPU: { manufacturer: ${formatStr(cpuData.manufacturer, '', 'unknown manufacturer')}, family: ${formatStr(cpuData.family, '', 'unkown family')},  model: ${formatStr(cpuData.brand, '','unknown processor')}, base speed: ${formatStr(cpuData.speedMin, '', 'unkown min speed')}GHz, up to: ${formatStr(cpuData.speedMax, '', 'unkown max speed')}GHz, ${formatStr(cpuData.physicalCores, 'c','unknown cores count')}/${formatStr(cpuData.cores, 't','unknown logical cores count')}, socket: ${formatStr(cpuData.socket, '', 'unknown socket')} }`)

    } catch (error) {
    console.error('Error getting system information:', error);
  }
}

function formatStr(str, strToConcat,errorMsg){
  return str ? str+strToConcat : errorMsg
}

function getToday(){
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

async function main() {
  if (isMainThread) {
    const numThreads = os.cpus().length; // Number of CPU threads
    const pointsPerThread = 1e9; // Defines the workload to perform
    console.log(`Benchmark started at ${new Date().toLocaleTimeString()}, ${getToday()}`)
    await showSystemInfo();

    const workers = [];
    const results = [];

    for (let i = 0; i < numThreads; i++) {
      const worker = new Worker('./cpubenchmark.js', {
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
