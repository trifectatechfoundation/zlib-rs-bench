type Unit = 'MB' | 'ms' | 'sec';
type MemoryMetric = [number, 'MB'];
type TimeMetric = [number, 'ms'];

type Root = {
  commit_hash: string
  timestamp: Timestamp
  arch: string
  os: string
  runner: string
  cpu_model: string
  bench_groups: Result[]
};

type Timestamp = {
  secs_since_epoch: number
  nanos_since_epoch: number
};

type Result = {
  cmd: string[]
  counters: Counters
};

type Counters = {
  cycles: Cycles
  instructions: Instructions
  "task-clock": TaskClock
};

type Cycles = {
  value: string
  unit: string
};

type Instructions = {
  value: string
  unit: string
};

type TaskClock = {
  value: string
  unit: string
};

type Plots = {
    data: (Plotly.Data & { name: string })[];
    layout: Partial<Plotly.Layout>;
};

function parseQueryString(): [Date | null, Date | null] {
    let start: Date | null = null;
    let end: Date | null = null;
    if (location.search != '') {
        const params = location.search.substring(1).split('&');
        for (const param of params) {
            const [name, value] = param.split('=', 2);
            if (value === '') {
                continue;
            }
            if (name == 'start') {
                start = new Date(value);
            } else if (name == 'end') {
                end = new Date(value);
            }
        }
    }
    return [start, end];
}

function mapUnitToMax(unit: Unit): Unit {
    switch (unit) {
        case 'ms':
            return 'sec';
        default:
            return unit;
    }
}

function show_notification(html_text: string) {
    var notificationElem = document.getElementById('notification')!;
    notificationElem.innerHTML = html_text;
    notificationElem.classList.remove('hidden');
    setTimeout(() => {
        notificationElem.classList.add('hidden');
    }, 3000);
}

function compression_ng_versus_rs(ng: Result[], rs: Result[]) {
    var plot = {
        data: [],
        layout: {
            title: "zlib-ng versus zlib-rs (compression)",
            xaxis: {
                title: "Compression Level",
            },
            yaxis: {
                title: "Wall Time (ms)",
                rangemode: "tozero",
            },
            height: 700,
            width: Math.min(1200, window.innerWidth - 30),
            margin: {
                l: 50,
                r: 20,
                b: 100,
                t: 100,
                pad: 4,
            },
            legend: {
                orientation: window.innerWidth < 700 ? "h" : "v",
            },
        },
    };

    plot.data.push({
        x: ng.map((result) => parseFloat(result.cmd[1])),
        y: ng.map((result) => parseFloat(result.counters["task-clock"].value)),
        name: "zlib-ng", 
    });

    plot.data.push({
        x: rs.map((result) => parseFloat(result.cmd[1])),
        y: rs.map((result) => parseFloat(result.counters["task-clock"].value)),
        name: "zlib-rs", 
    });


    return plot;
}

async function main() {
    const DATA_URL = 'https://raw.githubusercontent.com/trifectatechfoundation/zlib-rs-bench/main/metrics-linux-x86.json';
    const data = await (await fetch(DATA_URL)).text();
    const entries: Root[] = data
        .split('\n')
        .filter((it) => it.length > 0)
        .map((it) => JSON.parse(it));

    const [start, end] = parseQueryString();
    setTimeFrameInputs(start, end);



    const final = entries[entries.length - 1];
    const final_ng = final.bench_groups["blogpost-compress-ng"];
    const final_rs = final.bench_groups["blogpost-compress-rs"];
    const plot = compression_ng_versus_rs(final_ng, final_rs);


    // Render the plot
    const plotDiv = document.createElement(
        "div"
    ) as any as Plotly.PlotlyHTMLElement;

    Plotly.newPlot(plotDiv, plot.data, plot.layout);

    const bodyElement = document.getElementById('inner')!;
    bodyElement.appendChild(plotDiv);
}

function setDays(n: number) {
    const timestamp = +new Date() - n * 1000 * 60 * 60 * 24;
    const date = new Date(timestamp);
    setTimeFrameInputs(date, null);
}

function getTimeFrameInputs(): [HTMLInputElement, HTMLInputElement] {
    const start = document.getElementsByName('start')[0] as HTMLInputElement;
    const end = document.getElementsByName('end')[0] as HTMLInputElement;
    return [start, end];
}

function setTimeFrameInputs(start: Date | null, end: Date | null) {
    const [startInput, endInput] = getTimeFrameInputs();
    (startInput as any).value = start ? start.toISOString().split('T')[0] : '';
    (endInput as any).value = end ? end.toISOString().split('T')[0] : '';
}

main();
