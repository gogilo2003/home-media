const grid = document.getElementById('video-grid');
const empty = document.getElementById('empty');

async function loadVideos() {
  const res = await fetch('/api/videos');
  const videos = await res.json();

  if (!videos.length) {
    empty.classList.remove('hidden');
    return;
  }

  for (const video of videos) {
    const card = document.createElement('div');
    card.className = 'text-left p-4 rounded-lg bg-slate-900 border border-slate-800';
    const name = document.createElement('div');
    name.className = 'font-medium truncate';
    name.textContent = video.name;
    card.append(name);
    grid.append(card);
  }
}

loadVideos().catch((err) => console.error(err));