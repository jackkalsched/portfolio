import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line), // or just +row.line
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];

      // We can use object destructuring to get these properties
      let { author, date, time, timezone, datetime } = first;

      let ret = {
        id: commit,
        url: 'https://github.com/jackkalsched/portfolio/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        // Calculate hour as a decimal for time analysis
        // e.g., 2:30 PM = 14.5
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        // How many lines were modified?
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        configurable: true,
        writable: false,
        enumerable: false,
      });

      return ret;
    });
}

function renderCommitInfo(data, commits) {
  // Create the dl element
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  // Helper to add a metric with dt and dd
  function addMetric(label, value) {
    const div = dl.append('div').attr('class', 'stat-item');
    div.append('dt').html(label);
    div.append('dd').html(value);
  }

  // Add total commits
  addMetric('Total Commits', commits.length);

  // Add total LOC
  addMetric('Total <abbr title="Lines of code">LOC</abbr>', data.length);

  // Number of files in the codebase
  const numFiles = d3.group(data, (d) => d.file).size;
  addMetric('Number of Files', numFiles);

  // Longest file (by number of lines)
  const fileLengths = d3.rollups(
    data,
    (v) => d3.max(v, (d) => d.line),
    (d) => d.file
  );
  const longestFileEntry = d3.greatest(fileLengths, (d) => d[1]);
  const longestFileName = longestFileEntry ? longestFileEntry[0] : 'N/A';
  const longestFileLines = longestFileEntry ? longestFileEntry[1] : 0;
  addMetric('Longest File', `<code>${longestFileName}</code> (${longestFileLines} lines)`);

  // Time of day that most work is done
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

let data = await loadData();
let commits = processCommits(data);
console.log(commits);

renderCommitInfo(data, commits);

