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
  [name in CounterName]: Counter
};

type Counter = {
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

function results_over_time(
    title: string,
    lines: Root[],
    group: string,
    keys: string[],
    get_key: (cmd: string[]) => string,
    key_to_name: (key: string) => string,
    counter: CounterName,
): Plots {
    let plot: Plots = {
        data: [],
        layout: {
            title,
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
        for (let run of line.bench_groups[group]) {
            const key = get_key(run.cmd);

            if (!unzipped[key]) {
                unzipped[key] = { x: [], y: [], error: [], sha: [] };
            }

            unzipped[key].y[i] = run.counters[counter].value;
            unzipped[key].error[i] = Math.sqrt(run.counters[counter].variance ?? 0);
            unzipped[key].sha[i] = line.commit_hash;
        }
    }

    for (let key of keys) {
        if (!unzipped[key]) {
            continue;
        }

        plot.data.push({
            y: unzipped[key].y,
            error_y: {
                type: "data",
                array: unzipped[key].error,
                visible: true,
            },
            text: unzipped[key].sha,
            name: key_to_name(key),
            hovertemplate: `%{y} %{text}`
        });
    }

    return plot;
}

function compare_impls(
    title: string,
    from_name: string,
    from: SingleBench[],
    to_name: string,
    to: SingleBench[],
    xaxis_title: string,
    get_xval: (cmd: string[]) => number,
    counter: CounterName,
): Plots {
    let plot: Plots = {
        data: [],
        layout: {
            title,
            xaxis: {
                title: xaxis_title,
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
        x: from.map((result) => get_xval(result.cmd)),
        y: from.map((result) => result.counters[counter].value),
        error_y: {
            type: "data",
            array: from.map((result) => Math.sqrt(result.counters[counter].variance ?? 0)),
            visible: true,
        },
        name: from_name,
    });

    plot.data.push({
        x: to.map((result) => get_xval(result.cmd)),
        y: to.map((result) => result.counters[counter].value),
        error_y: {
            type: "data",
            array: to.map((result) => Math.sqrt(result.counters[counter].variance ?? 0)),
            visible: true,
        },
        text: to.map((result, index) => {
            let vrs = result.counters[counter].value;
            let vng = from[index].counters[counter].value;

            return ((vng / vrs)).toFixed(2);
        }),
        name: to_name,
        hovertemplate: `%{y} (%{text}x faster than ${from_name})`
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

function render_plot(plot: Plots) {
    const bodyElement = document.getElementById('plots')!;

    // Render the plot
    const plotDiv = document.createElement(
        "div"
    ) as any as Plotly.PlotlyHTMLElement;

    Plotly.newPlot(plotDiv, plot.data, plot.layout);

    bodyElement.appendChild(plotDiv);
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
        const plot = compare_impls(
            `zlib-ng versus zlib-rs (decompression, on <a href="https://github.com/trifectatechfoundation/zlib-rs/commit/${final.commit_hash}">main</a>)`,
            "zlib-ng",
            final_ng,
            "zlib-rs",
            final_rs,
            "Chunk Size (2^n bytes)",
            (cmd) => parseFloat(cmd[2]),
            counter,
        );
        render_plot(plot);
    }

    {
        const plot = results_over_time(
            "zlib-rs decompression",
            entries,
            "blogpost-uncompress-rs",
            Array.from({ length: 24 - 4 + 1 }, (_, i) => String(24 - i)),
            (cmd) => cmd[2],
            (level) => `2^${level}`,
            counter,
        );
        render_plot(plot);
    }

    {
        const final = entries[entries.length - 1];
        const final_ng = final.bench_groups["blogpost-compress-ng"];
        const final_rs = final.bench_groups["blogpost-compress-rs"];
        const plot = compare_impls(
            `zlib-ng versus zlib-rs (compression, on <a href="https://github.com/trifectatechfoundation/zlib-rs/commit/${final.commit_hash}">main</a>)`,
            "zlib-ng",
            final_ng,
            "zlib-rs",
            final_rs,
            "Compression Level",
            (cmd) => parseFloat(cmd[1]),
            counter,
        );
        render_plot(plot);
    }

    {
        const plot = results_over_time(
            "zlib-rs compression",
            entries,
            "blogpost-compress-rs",
            ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].reverse(),
            (cmd) => cmd[1],
            (level) => `level ${level}`,
            counter,
        );
        render_plot(plot);
    }
}

main();
