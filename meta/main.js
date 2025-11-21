import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let xScale;
let yScale;
let commits = [];
let filteredCommits = [];
let colors = d3.scaleOrdinal(d3.schemeTableau10);

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}

function processCommits(data) {
  const commits = d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      const first = lines[0];
      const { author, date, time, timezone, datetime } = first;
      const ret = {
        id: commit,
        url: 'https://github.com/jackkalsched/portfolio/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };
      Object.defineProperty(ret, 'lines', {
        value: lines,
        enumerable: false,
      });
      return ret;
    });

  // 🔥 Sort by datetime ASCENDING (oldest → newest)
  commits.sort((a, b) => a.datetime - b.datetime);

  return commits;
}

function renderScatterPlot(data) {
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 50 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  // --- Scales (global) ---
  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  // --- Gridlines ---
  svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  // --- Axes ---
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale).tickFormat(
    (d) => String(d % 24).padStart(2, '0') + ':00'
  );

  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .attr('class', 'x-axis') // new line to mark the g tag
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .attr('class', 'y-axis') // just for consistency
    .call(yAxis);

  // --- Dots ---
  const dots = svg.append('g').attr('class', 'dots');
  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, d) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(d);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', updateTooltipPosition)
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });

  createBrushSelector(svg);
}

function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-tooltip-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (Object.keys(commit).length === 0) return;
  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });
  time.textContent = commit.datetime?.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  author.textContent = commit.author;
  lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  document.getElementById('commit-tooltip').hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

function createBrushSelector(svg) {
  svg.call(d3.brush().on('start brush end', brushed));
  svg.select('.dots').raise();
}

function brushed(event) {
  const selection = event.selection;
  d3.selectAll('circle').classed('selected', (d) =>
    isCommitSelected(selection, d)
  );

  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function isCommitSelected(selection, commit) {
  if (!selection) return false;
  const [[x0, y0], [x1, y1]] = selection;
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }

  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type
  );

  container.innerHTML = '';
  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);
    container.innerHTML += `
      <dt>${language}</dt>
      <dd>${count} lines (${formatted})</dd>
    `;
  }
}

function updateFileDisplay(filteredCommits) {
  // 1. Gather all lines from selected commits
  let lines = filteredCommits.flatMap(d => d.lines);

  // 2. Group by filename
  let files = d3
  .groups(lines, (d) => d.file)
  .map(([name, lines]) => {
    return { name, lines };
  })
  .sort((a, b) => b.lines.length - a.lines.length);

  // 3. Bind data to the <div> children of #files
  let filesContainer = d3
    .select("#files")
    .selectAll("div")
    .data(files, d => d.name)
    .join(
      enter =>
        enter.append("div").call(div => {
          div.append("dt").append("code");
          div.append("dd");
        })
    );

  // 4. Update filename + line count
  // Update the DT: filename + line count (with <small>)
filesContainer.select("dt")
  .html(d => `
    <code>${d.name}</code>
    <small>${d.lines.length} lines</small>
  `);

// Update the DD: one bubble per line
filesContainer
  .select("dd")
  .selectAll("div")
  .data(d => d.lines)
  .join("div")
  .attr("class", "loc")
  .attr('style', (d) => `--color: ${colors(d.type)}`);
}

function updateScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 50 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#chart').select('svg');

  // ---- UPDATE SCALES ----
  xScale.domain(d3.extent(commits, d => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  // ---- UPDATE AXIS ----
  const xAxis = d3.axisBottom(xScale);
  svg.select('g.x-axis')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  // ---- JOIN ----
  const sortedCommits = d3.sort(commits, d => -d.totalLines);
  const dots = svg.select('g.dots');

  const circles = dots
    .selectAll('circle')
    .data(sortedCommits, d => d.id);   // <-- KEY HERE

  // ---- EXIT ----
  circles.exit().remove();  

  // ---- ENTER ----
  const circlesEnter = circles
    .enter()
    .append('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))   // CSS handles the initial animated r=0
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', updateTooltipPosition)
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });

  // ---- UPDATE (including enter-merge) ----
  circlesEnter.merge(circles)
    .transition()               // <-- smooth animation here
    .duration(300)
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines));
}

function updateLanguageBreakdownFromCommits(selectedCommits) {
  const container = document.getElementById('language-breakdown');

  if (!selectedCommits || selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }

  // Flatten lines for all selected commits
  const lines = selectedCommits.flatMap(d => d.lines);

  // Roll up by language
  const breakdown = d3.rollup(
    lines,
    v => v.length,
    d => d.type
  );

  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);
    container.innerHTML += `
      <dt>${language}</dt>
      <dd>${count} lines (${formatted})</dd>
    `;
  }
}

// ------------------------------
// Main
// ------------------------------
let data = await loadData();
commits = processCommits(data);
renderScatterPlot(data);

let commitProgress = 100;
let timeScale = d3
  .scaleTime()
  .domain([
    d3.min(commits, (d) => d.datetime),
    d3.max(commits, (d) => d.datetime),
  ])
  .range([0, 100]);
let commitMaxTime = timeScale.invert(commitProgress);

// ------------------------------
// Time Slider Logic
// ------------------------------
const slider = document.querySelector("#commit-progress");
const timeDisplay = document.querySelector("#commit-time");

// Update display when slider moves
function onTimeSliderChange() {
  // 1. Update commitProgress
  commitProgress = +slider.value;

  // 2. Convert slider value → datetime using invert()
  commitMaxTime = timeScale.invert(commitProgress);

  // 3. Update <time> element
  timeDisplay.textContent = commitMaxTime.toLocaleString();
  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  updateScatterPlot(data, filteredCommits);
  updateFileDisplay(filteredCommits);
}

// Event listener
slider.addEventListener("input", onTimeSliderChange);

// Run once on page load to initialize
onTimeSliderChange();

d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
		Made Git Commit on ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })}.
		I made <a href="${d.url}" target="_blank">${
      i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
    }</a>.
		Edited ${d.totalLines} lines across ${
      d3.rollups(
        d.lines,
        (D) => D.length,
        (d) => d.file,
      ).length
    } files.
	`,
  );

import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

function onStepEnter(response) {
  const commit = response.element.__data__;   // the commit associated with this .step
  if (!commit) return;

  // 1. Filter commits up to this point in time
  const currentTime = commit.datetime;
  const selected = commits.filter(d => d.datetime <= currentTime);

  // 2. Update slider display (optional, keeps UI synced)
  timeDisplay.textContent = currentTime.toLocaleString();

  // 3. Update scatter plot
  updateScatterPlot(data, selected);

  // 4. Update file breakdown
  updateFileDisplay(selected);
  updateLanguageBreakdownFromCommits(selected);
}
const scroller = scrollama();
scroller
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
  })
  .onStepEnter(onStepEnter);
