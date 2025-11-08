import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// ---------------------------
// Load CSV data
// ---------------------------
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

// ---------------------------
// Process commit-level data
// ---------------------------
function processCommits(data) {
  if (!data || data.length === 0) return [];

  const commitKey = 'commit' in data[0] ? 'commit' : 'commit_hash';
  const grouped = d3.groups(data, (d) => d[commitKey]);

  return grouped
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
        hourFrac:
          datetime instanceof Date ? datetime.getHours() + datetime.getMinutes() / 60 : null,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        configurable: true,
        writable: false,
        enumerable: false,
      });

      return ret;
    })
    .filter((d) => d.datetime instanceof Date && !isNaN(d.datetime));
}

// ---------------------------
// Tooltip content updater
// ---------------------------
function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (!commit || Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;

  if (commit.datetime instanceof Date && !isNaN(commit.datetime)) {
    date.textContent = commit.datetime.toLocaleDateString('en', { dateStyle: 'full' });
    time.textContent = commit.datetime.toLocaleTimeString('en', { timeStyle: 'short' });
  } else {
    date.textContent = 'Unknown date';
    time.textContent = '';
  }

  author.textContent = commit.author || 'Unknown';
  lines.textContent = commit.totalLines || 0;
}

// ---------------------------
// Render commit summary stats
// ---------------------------
function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  function addMetric(label, value) {
    const div = dl.append('div').attr('class', 'stat-item');
    div.append('dt').html(label);
    div.append('dd').html(value);
  }

  addMetric('Total Commits', commits.length);
  addMetric('Total <abbr title="Lines of code">LOC</abbr>', data.length);

  const numFiles = d3.group(data, (d) => d.file).size;
  addMetric('Number of Files', numFiles);

  const fileLengths = d3.rollups(
    data,
    (v) => d3.max(v, (d) => d.line),
    (d) => d.file
  );
  const longestFileEntry = d3.greatest(fileLengths, (d) => d[1]);
  const longestFileName = longestFileEntry ? longestFileEntry[0] : 'N/A';
  const longestFileLines = longestFileEntry ? longestFileEntry[1] : 0;
  addMetric('Longest File', `<code>${longestFileName}</code> (${longestFileLines} lines)`);

  const workByPeriod = d3.rollups(
    data,
    (v) => v.length,
    (d) => {
      const hour = d.datetime.getHours();
      if (hour >= 5 && hour < 12) return 'morning';
      if (hour >= 12 && hour < 17) return 'afternoon';
      if (hour >= 17 && hour < 21) return 'evening';
      return 'night';
    }
  );
  const maxPeriod = d3.greatest(workByPeriod, (d) => d[1]);
  const mostWorkPeriod = maxPeriod ? maxPeriod[0] : 'N/A';
  addMetric('Most Productive Time of Day', mostWorkPeriod);
}

// ---------------------------
// Render scatter plot
// ---------------------------
function renderScatterPlot(data, commits) {
  if (!commits || commits.length === 0) {
    console.error('No commits data available for scatter plot');
    return;
  }

  const width = 1000;
  const height = 600;

  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([0, width])
    .nice();

  const yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  // Update ranges
  xScale.range([usableArea.left, usableArea.right]);
  yScale.range([usableArea.bottom, usableArea.top]);

  // --- Gridlines (behind axes)
  const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);
  gridlines.call(
    d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width)
  );

  // --- Axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  // --- Dots
  const dots = svg.append('g').attr('class', 'dots');

  dots
    .selectAll('circle')
    .data(commits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', 5)
    .attr('fill', 'steelblue')
    .on('mouseenter', (event, commit) => {
      renderTooltipContent(commit);
      document.getElementById('commit-tooltip').style.opacity = 1;
    })
    .on('mouseleave', () => {
      document.getElementById('commit-tooltip').style.opacity = 0.6;
    });
}

// ---------------------------
// Load and render
// ---------------------------
(async function main() {
  const data = await loadData();
  const commits = processCommits(data);

  renderCommitInfo(data, commits);
  renderScatterPlot(data, commits);
})();
