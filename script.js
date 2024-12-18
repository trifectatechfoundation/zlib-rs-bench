"use strict";
function parseQueryString() {
    let start = null;
    let end = null;
    if (location.search != '') {
        const params = location.search.substring(1).split('&');
        for (const param of params) {
            const [name, value] = param.split('=', 2);
            if (value === '') {
                continue;
            }
            if (name == 'start') {
                start = new Date(value);
            }
            else if (name == 'end') {
                end = new Date(value);
            }
        }
    }
    return [start, end];
}
function mapUnitToMax(unit) {
    switch (unit) {
        case 'ms':
            return 'sec';
        default:
            return unit;
    }
}
function show_notification(html_text) {
    var notificationElem = document.getElementById('notification');
    notificationElem.innerHTML = html_text;
    notificationElem.classList.remove('hidden');
    setTimeout(() => {
        notificationElem.classList.add('hidden');
    }, 3000);
}
function compression_over_time(lines, counter) {
    var plot = {
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
    let unzipped = [];
    var i = 0;
    for (let line of lines) {
        for (let run of line.bench_groups["blogpost-compress-rs"]) {
            const key = run.cmd[1];
            if (!unzipped[key]) {
                unzipped[key] = { x: [], y: [], sha: [] };
            }
            unzipped[key].y.push(run.counters[counter].value);
            unzipped[key].sha.push(line.commit_hash);
        }
    }
    for (let level of ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].reverse()) {
        if (!unzipped[level]) {
            continue;
        }
        plot.data.push({
            y: unzipped[level].y,
            text: unzipped[level].sha,
            name: `level ${level}`,
            hovertemplate: `%{y} %{text}`
        });
    }
    return plot;
}
function compression_ng_versus_rs(commit, ng, rs, counter) {
    var plot = {
        data: [],
        layout: {
            title: `zlib-ng versus zlib-rs (compression, on <a href="https://github.com/rust-lang/rust/pull/134444/commits/${commit}">main</a>)`,
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
        y: ng.map((result) => parseFloat(result.counters[counter].value)),
        name: "zlib-ng",
    });
    plot.data.push({
        x: rs.map((result) => parseFloat(result.cmd[1])),
        y: rs.map((result) => parseFloat(result.counters[counter].value)),
        name: "zlib-rs",
    });
    return plot;
}
async function main() {
    const DATA_URL = 'https://raw.githubusercontent.com/trifectatechfoundation/zlib-rs-bench/main/metrics-macos-arm64.json';
    // const DATA_URL = '/fake-metrics.json';
    const data = await (await fetch(DATA_URL)).text();
    const entries = data
        .split('\n')
        .filter((it) => it.length > 0)
        .map((it) => JSON.parse(it));
    console.log(entries);
    const [start, end] = parseQueryString();
    setTimeFrameInputs(start, end);
    const counter = DATA_URL.includes("macos") ? "user-time" : "task-clock";
    {
        const plot = compression_over_time(entries, counter);
        // Render the plot
        const plotDiv = document.createElement("div");
        Plotly.newPlot(plotDiv, plot.data, plot.layout);
        const bodyElement = document.getElementById('inner');
        bodyElement.appendChild(plotDiv);
    }
    {
        const final = entries[entries.length - 1];
        const final_ng = final.bench_groups["blogpost-compress-ng"];
        const final_rs = final.bench_groups["blogpost-compress-rs"];
        const plot = compression_ng_versus_rs(final.commit_hash, final_ng, final_rs, counter);
        // Render the plot
        const plotDiv = document.createElement("div");
        Plotly.newPlot(plotDiv, plot.data, plot.layout);
        const bodyElement = document.getElementById('inner');
        bodyElement.appendChild(plotDiv);
    }
}
function setDays(n) {
    const timestamp = +new Date() - n * 1000 * 60 * 60 * 24;
    const date = new Date(timestamp);
    setTimeFrameInputs(date, null);
}
function getTimeFrameInputs() {
    const start = document.getElementsByName('start')[0];
    const end = document.getElementsByName('end')[0];
    return [start, end];
}
function setTimeFrameInputs(start, end) {
    const [startInput, endInput] = getTimeFrameInputs();
    startInput.value = start ? start.toISOString().split('T')[0] : '';
    endInput.value = end ? end.toISOString().split('T')[0] : '';
}
main();
