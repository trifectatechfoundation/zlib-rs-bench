type Unit = 'MB' | 'ms' | 'sec';
type MemoryMetric = [number, 'MB'];
type TimeMetric = [number, 'ms'];

type Root = {
  commit_hash: string
  commit_timestamp: number
  timestamp: Timestamp
  arch: string
  os: string
  runner: string
  cpu_model: string
  bench_groups: {[key: string]: SingleBench[]},
};

type Timestamp = {
  secs_since_epoch: number
  nanos_since_epoch: number
};

type SingleBench = {
  cmd: string[]
  counters: Counters
};

type CounterName = "cycles" | "instructions" | "user-time" | "task-clock";
type Counters = {
  cycles: Cycles
  instructions: Instructions
  "user-time": UserTime,
  "task-clock": TaskClock
};

type Cycles = {
  value: number
  unit: string
  variance: number | undefined
};

type Instructions = {
  value: number
  unit: string
  variance: number | undefined
};

type UserTime = {
  value: number
  unit: string
  variance: number | undefined
};

type TaskClock = {
  value: number
  unit: string
  variance: number | undefined
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
    let notificationElem = document.getElementById('notification')!;
    notificationElem.innerHTML = html_text;
    notificationElem.classList.remove('hidden');
    setTimeout(() => {
        notificationElem.classList.add('hidden');
    }, 3000);
}

function compression_over_time(lines: Root[], counter: CounterName): Plots {
    let plot: Plots = {
        data: [],
        layout: {
            title: "zlib-rs compression",
            xaxis: {
                title: "Benchmark Index",
                tickformat: 'd', // only integers
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

    let unzipped: {[level: string]: {x: [], y: number[], error: number[], sha: string[]}} = {};

    for (let i in lines) {
        let line = lines[i];
        for (let run of line.bench_groups["blogpost-compress-rs"]) {
            const key = run.cmd[1];

            if (!unzipped[key]) {
                unzipped[key] = { x: [], y: [], error: [], sha: [] };
            }

            unzipped[key].y[i] = run.counters[counter].value;
            unzipped[key].error[i] = Math.sqrt(run.counters[counter].variance ?? 0);
            unzipped[key].sha[i] = line.commit_hash;
        }
    }

    for (let level of ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].reverse()) {
        if (!unzipped[level]) {
            continue;
        }

        plot.data.push({
            y: unzipped[level].y,
            error_y: {
                type: "data",
                array: unzipped[level].error,
                visible: true,
            },
            text: unzipped[level].sha,
            name: `level ${level}`,
            hovertemplate: `%{y} %{text}`
        });
    }

    return plot;
}

function decompression_over_time(lines: Root[], counter: CounterName): Plots {
    let plot: Plots = {
        data: [],
        layout: {
            title: "zlib-rs decompression",
            xaxis: {
                title: "Benchmark Index",
                tickformat: 'd', // only integers
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

    let unzipped: {[level: string]: {x: [], y: number[], error: number[], sha: string[]}} = {};

    for (let i in lines) {
        let line = lines[i];
        for (let run of line.bench_groups["blogpost-uncompress-rs"]) {
            const key = run.cmd[2];

            if (!unzipped[key]) {
                unzipped[key] = { x: [], y: [], error: [], sha: [] };
            }

            unzipped[key].y[i] = run.counters[counter].value;
            unzipped[key].error[i] = Math.sqrt(run.counters[counter].variance ?? 0);
            unzipped[key].sha[i] = line.commit_hash;
        }
    }

    for (let level of Array.from({ length: 24 - 4 + 1 }, (_, i) => String(24 - i))) {
        if (!unzipped[level]) {
            continue;
        }

        plot.data.push({
            y: unzipped[level].y,
            error_y: {
                type: "data",
                array: unzipped[level].error,
                visible: true,
            },
            text: unzipped[level].sha,
            name: `2^${level}`,
            hovertemplate: `%{y} %{text}`
        });
    }

    return plot;
}

function compression_ng_versus_rs(commit: string, ng: SingleBench[], rs: SingleBench[], counter: CounterName): Plots {
    let plot: Plots = {
        data: [],
        layout: {
            title: `zlib-ng versus zlib-rs (compression, on <a href="https://github.com/trifectatechfoundation/zlib-rs/commit/${commit}">main</a>)`,
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
        y: ng.map((result) => result.counters[counter].value),
        error_y: {
            type: "data",
            array: ng.map((result) => Math.sqrt(result.counters[counter].variance ?? 0)),
            visible: true,
        },
        name: "zlib-ng",
    });

    plot.data.push({
        x: rs.map((result) => parseFloat(result.cmd[1])),
        y: rs.map((result) => result.counters[counter].value),
        error_y: {
            type: "data",
            array: rs.map((result) => Math.sqrt(result.counters[counter].variance ?? 0)),
            visible: true,
        },
        text: rs.map((result, index) => {
            let vrs = result.counters[counter].value;
            let vng = ng[index].counters[counter].value;

            return ((vng / vrs)).toFixed(2);
        }),
        name: "zlib-rs",
        hovertemplate:
        '%{y} (%{text}x faster than zlib-ng)'
    });


    return plot;
}

function decompression_ng_versus_rs(commit: string, ng: SingleBench[], rs: SingleBench[], counter: CounterName): Plots {
    let plot: Plots = {
        data: [],
        layout: {
            title: `zlib-ng versus zlib-rs (decompression, on <a href="https://github.com/trifectatechfoundation/zlib-rs/commit/${commit}">main</a>)`,
            xaxis: {
                title: "Chunk Size (2^n bytes)",
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
        x: ng.map((result) => parseFloat(result.cmd[2])),
        y: ng.map((result) => result.counters[counter].value),
        error_y: {
            type: "data",
            array: ng.map((result) => Math.sqrt(result.counters[counter].variance ?? 0)),
            visible: true,
        },
        name: "zlib-ng",
    });

    plot.data.push({
        x: rs.map((result) => parseFloat(result.cmd[2])),
        y: rs.map((result) => result.counters[counter].value),
        error_y: {
            type: "data",
            array: rs.map((result) => Math.sqrt(result.counters[counter].variance ?? 0)),
            visible: true,
        },
        text: rs.map((result, index) => {
            let vrs = result.counters[counter].value;
            let vng = ng[index].counters[counter].value;

            return ((vng / vrs)).toFixed(2);
        }),
        name: "zlib-rs",
        hovertemplate:
        '%{y} (%{text}x faster than zlib-ng)'
    });


    return plot;
}

async function main() {
    await update('linux-x86');
}

async function update(target: string) {
    let data_url = `https://raw.githubusercontent.com/trifectatechfoundation/zlib-rs-bench/main/metrics-${target}.json`

    const data = await (await fetch(data_url)).text();

    const entries: Root[] = data
        .split('\n')
        .filter((it) => it.length > 0)
        .map((it) => JSON.parse(it));

    render(data_url, entries);
}

function render(data_url: string, entries: Root[]) {
    const bodyElement = document.getElementById('plots')!;

    // clear the plots from the previous configuration
    while (bodyElement.firstChild) {
        bodyElement.removeChild(bodyElement.firstChild);
    }

    const counter: CounterName = data_url.includes("macos") ? "user-time" : "task-clock";

    {
        const final = entries[entries.length - 1];
        const final_ng = final.bench_groups["blogpost-uncompress-ng"];
        const final_rs = final.bench_groups["blogpost-uncompress-rs"];
        const plot = decompression_ng_versus_rs(final.commit_hash, final_ng, final_rs, counter);


        // Render the plot
        const plotDiv = document.createElement(
            "div"
        ) as any as Plotly.PlotlyHTMLElement;

        Plotly.newPlot(plotDiv, plot.data, plot.layout);

        bodyElement.appendChild(plotDiv);
    }

    {
        const plot = decompression_over_time(entries, counter);

        // Render the plot
        const plotDiv = document.createElement(
            "div"
        ) as any as Plotly.PlotlyHTMLElement;

        Plotly.newPlot(plotDiv, plot.data, plot.layout);

        bodyElement.appendChild(plotDiv);
    }

    {
        const final = entries[entries.length - 1];
        const final_ng = final.bench_groups["blogpost-compress-ng"];
        const final_rs = final.bench_groups["blogpost-compress-rs"];
        const plot = compression_ng_versus_rs(final.commit_hash, final_ng, final_rs, counter);


        // Render the plot
        const plotDiv = document.createElement(
            "div"
        ) as any as Plotly.PlotlyHTMLElement;

        Plotly.newPlot(plotDiv, plot.data, plot.layout);

        bodyElement.appendChild(plotDiv);
    }

    {
        const plot = compression_over_time(entries, counter);

        // Render the plot
        const plotDiv = document.createElement(
            "div"
        ) as any as Plotly.PlotlyHTMLElement;

        Plotly.newPlot(plotDiv, plot.data, plot.layout);

        bodyElement.appendChild(plotDiv);
    }
}

main();
