import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// ---------- LOAD DATA ----------
async function loadData() {
  const parseDateTime = d3.timeParse('%Y-%m-%d %H:%M:%S');

  const data = await d3.csv('loc.csv', (row) => {
    const parsedDateTime = parseDateTime(row.datetime) || new Date(row.datetime);
    return {
      ...row,
      line: +row.line,
      depth: +row.depth,
      length: +row.length,
      date: new Date(row.date + 'T00:00' + (row.timezone || '')),
      datetime: parsedDateTime,
    };
  });
  return data;
}

// ---------- PROCESS COMMITS ----------
function processCommits(data) {
  if (!data?.length) return [];
  const commitKey = 'commit' in data[0] ? 'commit' : 'commit_hash';
  return d3.groups(data, (d) => d[commitKey]).map(([commit, lines]) => {
    const f = lines[0];
    const { author, date, time, timezone, datetime } = f;
    const obj = {
      id: commit,
      url: 'https://github.com/jackkalsched/portfolio/commit/' + commit,
      author,
      date,
      time,
      timezone,
      datetime,
      hourFrac:
        datetime instanceof Date ? datetime.getHours() + datetime.getMinutes() / 60 : null,
      totalLines: lines.length,
    };
    Object.defineProperty(obj, 'lines', { value: lines });
    return obj;
  });
}

// ---------- TOOLTIP HELPERS ----------
function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-tooltip-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (!commit || Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;

  if (commit.datetime instanceof Date && !isNaN(commit.datetime)) {
    date.textContent = commit.datetime.toLocaleDateString('en', { dateStyle: 'full' });
    time.textContent = commit.datetime.toLocaleTimeString('en', { timeStyle: 'short' });
  } else {
    date.textContent = 'Unknown';
    time.textContent = '';
  }

  author.textContent = commit.author || 'Unknown';
  lines.textContent = commit.totalLines || 0;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  const offset = 15;
  tooltip.style.left = `${event.clientX + offset}px`;
  tooltip.style.top = `${event.clientY + offset}px`;
}

// ---------- BRUSH LOGIC ----------
let xScale, yScale; // make global for brush access

function isCommitSelected(selection, commit) {
  if (!selection) return false;
  const [[x0, y0], [x1, y1]] = selection;
  const cx = xScale(commit.datetime);
  const cy = yScale(commit.hourFrac);
  return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
}

function renderSelectionCount(selection, commits) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

function renderLanguageBreakdown(selection, commits) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }

  const lines = selectedCommits.flatMap((d) => d.lines);

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

function brushed(event, commits) {
  const selection = event.selection;

  d3.selectAll('circle').classed('selected', (d) =>
    isCommitSelected(selection, d)
  );

  renderSelectionCount(selection, commits);
  renderLanguageBreakdown(selection, commits);
}

// ---------- SCATTERPLOT ----------
function renderScatterPlot(data, commits) {
  if (!commits?.length) {
    console.error('No commits for scatterplot');
    return;
  }

  // --- Dimensions & margins
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  // --- SVG setup
  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  // --- Scales (store globally for brush)
  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3
    .scaleSqrt()
    .domain([minLines, maxLines])
    .range([4, 25]);

  // --- Gridlines
  svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left},0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  // --- Axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => `${String(d % 24).padStart(2, '0')}:00`);

  svg
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${usableArea.bottom})`)
    .call(xAxis);

  svg
    .append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${usableArea.left},0)`)
    .call(yAxis);

  // --- Draw dots
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  svg
    .append('g')
    .attr('class', 'dots')
    .selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.65)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', (event) => updateTooltipPosition(event))
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.65);
      updateTooltipVisibility(false);
    });

  // --- Step 5.1 & 5.4: Create brush + events
  svg.call(d3.brush().on('start brush end', (event) => brushed(event, commits)));

  // --- Step 5.2: Raise dots back above overlay for hover
  svg.selectAll('.dots, .overlay ~ *').raise();
}

// ---------- UPDATE SCATTERPLOT ----------
function updateScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#chart').select('svg');

  xScale = xScale.domain(d3.extent(commits, (d) => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const xAxis = d3.axisBottom(xScale);

  // Clear out the existing x-axis and then create a new one
  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(xAxis);

  const dots = svg.select('g.dots');

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  dots
    .selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
}

// ---------- COMMIT STATS ----------
function renderCommitInfo(data, commits) {
  d3.select('#stats').selectAll('*').remove();
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');
  const metric = (label, val) => {
    const div = dl.append('div').attr('class', 'stat-item');
    div.append('dt').html(label);
    div.append('dd').html(val);
  };

  metric('Total Commits', commits.length);
  metric('Total LOC', data.length);

  const numFiles = 'file' in data[0] ? d3.group(data, (d) => d.file).size : 'N/A';
  metric('Number of Files', numFiles);

  const workByPeriod = d3.rollups(
    data,
    (v) => v.length,
    (d) => {
      const h = d.datetime.getHours();
      if (h >= 5 && h < 12) return 'Morning';
      if (h >= 12 && h < 17) return 'Afternoon';
      if (h >= 17 && h < 21) return 'Evening';
      return 'Night';
    }
  );
  const maxPeriod = d3.greatest(workByPeriod, (d) => d[1]);
  metric('Most Productive Time of Day', maxPeriod ? maxPeriod[0] : 'N/A');
}

// ---------- TIME FILTERING ----------
let commitProgress = 100;
let commitMaxTime;
let timeScale;
let filteredCommits;
let allCommits;
let allData;

function onTimeSliderChange() {
  const slider = document.getElementById('commit-progress');
  const timeElement = document.getElementById('commit-time');
  
  if (!slider || !timeElement) return;
  
  commitProgress = Number(slider.value);
  commitMaxTime = timeScale.invert(commitProgress);
  
  if (commitMaxTime && commitMaxTime instanceof Date && !isNaN(commitMaxTime)) {
    const formattedDate = commitMaxTime.toLocaleString('en', {
      dateStyle: 'long',
      timeStyle: 'short'
    });
    timeElement.textContent = formattedDate;
    timeElement.setAttribute('datetime', commitMaxTime.toISOString());
  }
  
  // Filter commits by commitMaxTime
  filteredCommits = allCommits.filter((d) => d.datetime <= commitMaxTime);
  
  // Update the scatter plot with filtered commits
  updateScatterPlot(allData, filteredCommits);
}

// ---------- MAIN ----------
(async function main() {
  const data = await loadData();
  const commits = processCommits(data);
  
  // Store globally for filtering
  allCommits = commits;
  allData = data;
  filteredCommits = commits;
  
  // Create time scale for filtering
  timeScale = d3
    .scaleTime()
    .domain([
      d3.min(commits, (d) => d.datetime),
      d3.max(commits, (d) => d.datetime),
    ])
    .range([0, 100]);
  
  commitMaxTime = timeScale.invert(commitProgress);
  
  // Set up slider event listener
  const slider = document.getElementById('commit-progress');
  if (slider) {
    slider.addEventListener('input', () => onTimeSliderChange());
    // Initialize the time display
    onTimeSliderChange();
  }
  
  renderCommitInfo(data, commits);
  renderScatterPlot(data, commits);
})();
