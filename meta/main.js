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
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

// ---------- SCATTERPLOT ----------
function renderScatterPlot(data, commits) {
  if (!commits?.length) {
    console.error('No commits for scatterplot');
    return;
  }

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

  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  const yScale = d3.scaleLinear().domain([0, 24]).range([usableArea.bottom, usableArea.top]);

  // Gridlines
  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left},0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  // Axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale).tickFormat((d) => `${String(d % 24).padStart(2, '0')}:00`);

  svg.append('g')
    .attr('transform', `translate(0,${usableArea.bottom})`)
    .call(xAxis);
  svg.append('g')
    .attr('transform', `translate(${usableArea.left},0)`)
    .call(yAxis);

  // Dots
  svg.append('g')
    .attr('class', 'dots')
    .selectAll('circle')
    .data(commits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', 5)
    .attr('fill', 'steelblue')
    .on('mouseenter', (event, commit) => {
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', (event) => updateTooltipPosition(event))
    .on('mouseleave', () => {
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

// ---------- MAIN ----------
(async function main() {
  const data = await loadData();
  const commits = processCommits(data);
  renderCommitInfo(data, commits);
  renderScatterPlot(data, commits);
})();
