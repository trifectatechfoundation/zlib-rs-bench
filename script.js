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
    let notificationElem = document.getElementById('notification');
    notificationElem.innerHTML = html_text;
    notificationElem.classList.remove('hidden');
    setTimeout(() => {
        notificationElem.classList.add('hidden');
    }, 3000);
}
function compression_over_time(lines, counter) {
    let plot = {
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
    let unzipped = {};
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
function decompression_over_time(lines, counter) {
    let plot = {
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
    let unzipped = {};
    for (let line of lines) {
        for (let run of line.bench_groups["blogpost-uncompress-rs"]) {
            const key = run.cmd[2];
            if (!unzipped[key]) {
                unzipped[key] = { x: [], y: [], sha: [] };
            }
            unzipped[key].y.push(run.counters[counter].value);
            unzipped[key].sha.push(line.commit_hash);
        }
    }
    for (let level of Array.from({ length: 24 - 4 + 1 }, (_, i) => String(24 - i))) {
        if (!unzipped[level]) {
            continue;
        }
        plot.data.push({
            y: unzipped[level].y,
            text: unzipped[level].sha,
            name: `2^${level}`,
            hovertemplate: `%{y} %{text}`
        });
    }
    return plot;
}
function compression_ng_versus_rs(commit, ng, rs, counter) {
    let plot = {
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
        y: ng.map((result) => parseFloat(result.counters[counter].value)),
        name: "zlib-ng",
    });
    plot.data.push({
        x: rs.map((result) => parseFloat(result.cmd[1])),
        y: rs.map((result) => parseFloat(result.counters[counter].value)),
        text: rs.map((result, index) => {
            let vrs = parseFloat(result.counters[counter].value);
            let vng = parseFloat(ng[index].counters[counter].value);
            return ((vng / vrs)).toFixed(2);
        }),
        name: "zlib-rs",
        hovertemplate: '%{y} (%{text}x faster than zlib-ng)'
    });
    return plot;
}
function decompression_ng_versus_rs(commit, ng, rs, counter) {
    let plot = {
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
        y: ng.map((result) => parseFloat(result.counters[counter].value)),
        name: "zlib-ng",
    });
    plot.data.push({
        x: rs.map((result) => parseFloat(result.cmd[2])),
        y: rs.map((result) => parseFloat(result.counters[counter].value)),
        text: rs.map((result, index) => {
            let vrs = parseFloat(result.counters[counter].value);
            let vng = parseFloat(ng[index].counters[counter].value);
            return ((vng / vrs)).toFixed(2);
        }),
        name: "zlib-rs",
        hovertemplate: '%{y} (%{text}x faster than zlib-ng)'
    });
    return plot;
}
async function main() {
    await update('linux-x86');
}
async function update(target) {
    let data_url = `https://raw.githubusercontent.com/trifectatechfoundation/zlib-rs-bench/main/metrics-${target}.json`;
    const data = await (await fetch(data_url)).text();
    const entries = data
        .split('\n')
        .filter((it) => it.length > 0)
        .map((it) => JSON.parse(it));
    render(data_url, entries);
}
function render(data_url, entries) {
    const bodyElement = document.getElementById('plots');
    // clear the plots from the previous configuration
    while (bodyElement.firstChild) {
        bodyElement.removeChild(bodyElement.firstChild);
    }
    const counter = data_url.includes("macos") ? "user-time" : "task-clock";
    {
        const final = entries[entries.length - 1];
        const final_ng = final.bench_groups["blogpost-uncompress-ng"];
        const final_rs = final.bench_groups["blogpost-uncompress-rs"];
        const plot = decompression_ng_versus_rs(final.commit_hash, final_ng, final_rs, counter);
        // Render the plot
        const plotDiv = document.createElement("div");
        Plotly.newPlot(plotDiv, plot.data, plot.layout);
        bodyElement.appendChild(plotDiv);
    }
    {
        const plot = decompression_over_time(entries, counter);
        // Render the plot
        const plotDiv = document.createElement("div");
        Plotly.newPlot(plotDiv, plot.data, plot.layout);
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
        bodyElement.appendChild(plotDiv);
    }
    {
        const plot = compression_over_time(entries, counter);
        // Render the plot
        const plotDiv = document.createElement("div");
        Plotly.newPlot(plotDiv, plot.data, plot.layout);
        bodyElement.appendChild(plotDiv);
    }
}
main();
