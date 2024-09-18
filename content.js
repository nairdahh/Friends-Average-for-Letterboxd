const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getHTML = (url) => fetch(url).then(response => response.text());

const getInfo = async () => {
    await sleep(1000);

    const mainNav = document.querySelector('.main-nav');
    if (!mainNav) {
        await sleep(100);
        return getInfo();
    }

    const metaUrl = document.querySelector('meta[property="og:url"]');
    const movieLink = metaUrl ? metaUrl.getAttribute('content') : '';
    const urlPart = movieLink.split('film/')[1]?.split('/')[1];
    const exclude = ['members', 'likes', 'reviews', 'ratings', 'fans', 'lists'];

    if (!exclude.includes(urlPart)) {
        const movie = movieLink.match(/film\/(.*?)\//)[1];
        const profileLink = Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === 'Profile');
        const user = profileLink ? profileLink.getAttribute('href') : '';

        if (user) {
            return [user, movie];
        }
    }
    return null;
};

const getContent = async (url, userMovie) => {
    const ratingList = [];
    let personCount = 0;
    let likeCount = 0;

    while (true) {
        if (url) {
            const html = await getHTML(url);
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const tbody = doc.querySelector('tbody');

            if (tbody) {
                const rows = tbody.querySelectorAll('tr');
                rows.forEach(row => {
                    const person = row.querySelector('.name')?.getAttribute('href');
                    if (person !== userMovie[0]) {
                        const ratingClass = row.querySelector('.rating')?.getAttribute('class');
                        personCount += 1;
                        const like = row.querySelector('.icon-liked');
                        if (like) likeCount += 1;
                        if (ratingClass) {
                            const rating = parseInt(ratingClass.split('-')[1], 10);
                            ratingList.push(rating);
                        }
                    }
                });

                const nextPageLink = doc.querySelector('.next')?.parentElement?.getAttribute('href');
                if (nextPageLink) {
                    url = `https://letterboxd.com${nextPageLink}`;
                } else {
                    prepareContent(ratingList, personCount, likeCount, userMovie);
                    return;
                }
            } else {
                prepareContent(ratingList, personCount, likeCount, userMovie);
                return;
            }
        }
    }
};




const prepareContent = (ratingList, personCount, likeCount, userMovie) => {
    const votes = ratingList.length;
    const avg = votes === 0 ? '–.–' : (ratingList.reduce((sum, rating) => sum + rating, 0) / (votes * 2)).toFixed(1);

    const hrefHead = `${userMovie[0]}friends/film/${userMovie[1]}`;
    const hrefLikes = `${userMovie[0]}friends/film/${userMovie[1]}/likes/`;

    const ratingCount = Array(10).fill(0);
    ratingList.forEach(rating => {
        if (rating >= 1 && rating <= 10) {
            ratingCount[rating - 1]++;
        }
    });

    const maxRating = Math.max(...ratingCount);
    const maxHeight = 44; // Maximum height of the bars in pixels
    const barWidth = 15; // Width of each bar in pixels
    const spacing = 1; // Space between bars

    const relativeHeight = ratingCount.map(count => Math.max((count / maxRating) * maxHeight, 1)); // Calculate height based on percentage
    const percentRating = ratingCount.map(count => Math.round((count / votes) * 100));

    const ratingHtml = ratingCount.map((count, i) => `
        <li class="rating-histogram-bar" style="width: ${barWidth}px; height: ${relativeHeight[i]}px; left: ${i * (barWidth + spacing)}px; background-color: #445566; border-radius: 2px 2px 0px 0px;">
            <a href="${hrefHead}" class="ir tooltip" data-original-title="${count} ${i + 1}-star rating${count > 1 ? 's' : ''} (${percentRating[i]}%)" style="display: block; height: 100%;">
                ${count} ${i + 1}-star rating${count > 1 ? 's' : ''}
            </a>
        </li>
    `).join('');

    const histogramWidth = ratingCount.length * (barWidth + spacing); // Dynamic width for the histogram bars
    const histogramLeftMargin = 15; // Adjust how far left the histogram is positioned

    const html = `
        <section class="section ratings-histogram-chart" style="margin-top: 2.46153846rem;">
          <h2 class="section-heading">
            <a href="${hrefHead}" title="">Friends' Rating</a>
          </h2>
          <a href="${hrefLikes}" class="all-link more-link">${likeCount} ${likeCount === 1 ? 'like' : 'likes'}</a>
          <span class="average-rating">
            <a href="${hrefHead}" class="tooltip display-rating -highlight" data-original-title="Average of ${avg} based on ${votes} ${votes === 1 ? 'rating' : 'ratings'}">${avg}</a>
          </span>
          <div class="rating-histogram clear rating-histogram-exploded" style="position: relative; width: 100%; height: ${maxHeight}px;">
            <span class="rating-green rating-green-tiny rating-1" style="position: absolute">
              <span class="rating rated-2" style="display: block;">★</span>
            </span>
            <ul style="position: absolute; bottom: 0; left: ${histogramLeftMargin}px; margin: 0; width: ${histogramWidth}px;">
              ${ratingHtml}
            </ul>
            <span class="rating-green rating-green-tiny rating-5" style="position: absolute">
              <span class="rating rated-10" style="display: block;">★★★★★</span>
            </span>
          </div>
        </section>
    `;

    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.insertAdjacentHTML('beforeend', html);

        // Add hover effect
        const bars = document.querySelectorAll('.rating-histogram-bar');
        bars.forEach(bar => {
            bar.addEventListener('mouseover', () => {
                bar.style.filter = 'brightness(150%)';
            });
            bar.addEventListener('mouseout', () => {
                bar.style.filter = 'brightness(100%)';
            });
        });
    }
};






const main = async () => {
    const userMovie = await getInfo();
    if (userMovie) {
        const user = userMovie[0];
        const movie = userMovie[1];
        const newURL = `https://letterboxd.com${user}friends/film/${movie}`;
        await getContent(newURL, userMovie);
    }
};

main();
