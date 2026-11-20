"use strict";
function counter_to_title(counter) {
    switch (counter) {
        case "task-clock": {
            return "Wall Time (ms)";
        }
        case "user-time": {
            return "Wall Time (ms)";
        }
        case "cycles": {
            return "Cycles";
        }
        case "instructions": {
            return "Instructions";
        }
        default: {
            return "unknown";
        }
    }
}
function counter_to_verb(counter) {
    switch (counter) {
        case "task-clock": {
            return "faster";
        }
        case "user-time": {
            return "faster";
        }
        default: {
            return "better";
        }
    }
}
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
function results_over_time(title, lines, benchmark, subject, keys, get_key, key_to_name, counter) {
    var _a;
    let plot = {
        data: [],
        layout: {
            title,
            xaxis: {
                title: "Benchmark Index",
                tickformat: 'd', // only integers
            },
            yaxis: {
                title: counter_to_title(counter),
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
    for (let i in lines) {
        let line = lines[i];
        for (let run of line.benchmarks[benchmark][subject]) {
            const key = get_key(run.cmd);
            if (!unzipped[key]) {
                unzipped[key] = { x: [], y: [], error: [], sha: [] };
            }
            unzipped[key].y[i] = run.counters[counter].value;
            unzipped[key].error[i] = Math.sqrt((_a = run.counters[counter].variance) !== null && _a !== void 0 ? _a : 0);
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
function compare_impls(title, subjects, benchmark, xaxis_title, get_xval, counter, range) {
    let plot = {
        data: [],
        layout: {
            title,
            xaxis: {
                title: xaxis_title,
                range: range,
            },
            yaxis: {
                title: counter_to_title(counter),
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
    for (const subject in benchmark) {
        const data = benchmark[subject];
        plot.data.push({
            x: data.map((result) => get_xval(result.cmd)),
            y: data.map((result) => result.counters[counter].value),
            error_y: {
                type: "data",
                array: data.map((result) => { var _a; return Math.sqrt((_a = result.counters[counter].variance) !== null && _a !== void 0 ? _a : 0); }),
                visible: true,
            },
            name: subjects[subject].name,
        });
        if (typeof plot.data[0].x[0] == "string") {
            plot.data[plot.data.length - 1].type = "bar";
        }
    }
    return plot;
}
async function main() {
    await update('linux-x86', 'task-clock');
}
async function update(target, counter) {
    console.log(counter);
    let data_url = `https://raw.githubusercontent.com/trifectatechfoundation/zlib-rs-bench/main/metrics-${target}.json`;
    const data = await (await fetch(data_url)).text();
    const entries = data
        .split('\n')
        .filter((it) => it.length > 0)
        .map((it) => JSON.parse(it));
    render(target, entries, counter);
}
function render_plot(plot) {
    const bodyElement = document.getElementById('plots');
    // Render the plot
    const plotDiv = document.createElement("div");
    Plotly.newPlot(plotDiv, plot.data, plot.layout);
    bodyElement.appendChild(plotDiv);
}
function render(target, entries, counter) {
    const bodyElement = document.getElementById('plots');
    // clear the plots from the previous configuration
    while (bodyElement.firstChild) {
        bodyElement.removeChild(bodyElement.firstChild);
    }
    console.log(counter);
    const final = entries[entries.length - 1];
    {
        const plot = compare_impls(`Decompression (${counter}, on <a href="https://github.com/trifectatechfoundation/zlib-rs/commit/${final.commit_hash}">main</a>)`, final.subjects, final.benchmarks["decompression"], "Input Chunk Size (power of 2 bytes)", (cmd) => parseFloat(cmd[2]), counter, [5, 16]);
        render_plot(plot);
    }
    {
        const plot = results_over_time("zlib-rs decompression", entries, "decompression", "zlib-rs", Array.from({ length: 24 - 4 + 1 }, (_, i) => String(24 - i)), (cmd) => cmd[2], (level) => `2^${level}`, counter);
        render_plot(plot);
    }
    {
        const plot = compare_impls(`Compression (${counter}, on <a href="https://github.com/trifectatechfoundation/zlib-rs/commit/${final.commit_hash}">main</a>)`, final.subjects, final.benchmarks["compression"], "Compression Level", (cmd) => parseFloat(cmd[1]), counter, [0, 9]);
        render_plot(plot);
    }
    {
        const plot = results_over_time("zlib-rs compression", entries, "compression", "zlib-rs", ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].reverse(), (cmd) => cmd[1], (level) => `level ${level}`, counter);
        render_plot(plot);
    }
}
main();
