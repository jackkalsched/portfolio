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

  // Define overall dimensions
  const width = 1000;
  const height = 600;

  // Create the SVG container
  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  // Create scales
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([0, width])
    .nice();

  const yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

  // Define margins and usable area
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  // Update scale ranges
  xScale.range([usableArea.left, usableArea.right]);
  yScale.range([usableArea.bottom, usableArea.top]);

  // -----------------------
  // Step 2.3: Add gridlines
  // -----------------------

  // Add gridlines BEFORE axes (so they appear behind)
  const hours = d3.range(0, 25, 2); // every 2 hours
  const colorScale = d3
    .scaleLinear()
    .domain([0, 6, 12, 18, 24])
    .range(['#003f5c', '#2f4b7c', '#ffa600', '#ff7c43', '#003f5c']); // night → day → night

  svg
    .append('g')
    .attr('class', 'gridlines-colored')
    .selectAll('line')
    .data(hours)
    .join('line')
    .attr('x1', usableArea.left)
    .attr('x2', usableArea.right)
    .attr('y1', (d) => yScale(d))
    .attr('y2', (d) => yScale(d))
    .attr('stroke', (d) => colorScale(d))
    .attr('stroke-opacity', 0.3)
    .attr('stroke-width', 1);


  // -----------------------
  // Axes
  // -----------------------
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

  // -----------------------
  // Scatterplot dots
  // -----------------------
  const dots = svg.append('g').attr('class', 'dots');

  dots
    .selectAll('circle')
    .data(commits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', 5)
    .attr('fill', 'steelblue')
    .attr('opacity', 0.8);
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
