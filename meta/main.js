import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// ---------------------------
// Load CSV data
// ---------------------------
async function loadData() {
  // Try parsing datetime robustly using d3.timeParse
  const parseDateTime = d3.timeParse('%Y-%m-%d %H:%M:%S'); // adjust if needed

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

  // Ensure we’re grouping by the correct column
  const commitKey = 'commit' in data[0] ? 'commit' : 'commit_hash';

  const grouped = d3.groups(data, (d) => d[commitKey]);

  return grouped.map(([commit, lines]) => {
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
      hourFrac: datetime instanceof Date ? datetime.getHours() + datetime.getMinutes() / 60 : null,
      totalLines: lines.length,
    };

    Object.defineProperty(ret, 'lines', {
      value: lines,
      configurable: true,
      writable: false,
      enumerable: false,
    });

    return ret;
  }).filter((d) => d.datetime instanceof Date && !isNaN(d.datetime));
}

// ---------------------------
// Render commit statistics
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
  const margin = { top: 20, right: 30, bottom: 50, left: 60 };

  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([margin.left, width - margin.right])
    .nice();

  const yScale = d3.scaleLinear().domain([0, 24]).range([height - margin.bottom, margin.top]);

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale).tickFormat((d) => `${String(d).padStart(2, '0')}:00`);

  svg
    .append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(yAxis);

  svg
    .append('g')
    .attr('class', 'dots')
    .selectAll('circle')
    .data(commits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', 5)
    .attr('fill', 'steelblue')
    .attr('opacity', 0.8);

  // Axis labels
  svg
    .append('text')
    .attr('x', width / 2)
    .attr('y', height - 10)
    .attr('text-anchor', 'middle')
    .text('Date');

  svg
    .append('text')
    .attr('x', -height / 2)
    .attr('y', 15)
    .attr('transform', 'rotate(-90)')
    .attr('text-anchor', 'middle')
    .text('Time of Day');
}

// ---------------------------
// Load, process, and render
// ---------------------------
(async function main() {
  const data = await loadData();
  console.log('Sample data:', data[0]);

  const commits = processCommits(data);
  console.log('Processed commits:', commits.slice(0, 5));

  renderCommitInfo(data, commits);
  renderScatterPlot(data, commits);
})();
