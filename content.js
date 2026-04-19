// Delay
let sleep = function (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Function to fetch the HTML content of a given URL.
let getHTML = function (url) {
  return fetch(url).then((result) => {
    return result.text();
  });
};

// Asynchronous function to retrieve the username and movie from the current Letterboxd page.
// Continuously checks the page until the necessary elements are found.
let getinfo = async () => {
  var main_nav = $(".main-nav").html();
  if (typeof main_nav == "undefined") {
    // If main navigation is not found, wait and try again.
    await sleep(100);
    return getinfo();
  } else {
    let movie_link = $('meta[property="og:url"]').attr("content");
    url_part = movie_link.split("film/")[1].split("/")[1];
    let exclude = ["members", "likes", "reviews", "ratings", "fans", "lists"];
    if (!exclude.includes(url_part)) {
      let movie = movie_link.match("(?<=film/)(.*?)(?=/)")[0];
      let user_link = $('a:contains("Profile")').parent().html();
      let user = $(user_link).attr("href");
      if (typeof user !== "undefined") {
        return [user, movie];
      }
    }

    return null;
  }
};

// Asynchronous function to retrieve content from a given URL and process friend ratings.
// Pages through the ratings, extracting necessary information and aggregating it.

// Initialize variables to store raitng data
let getContent = async (url, user_movie) => {
  var rating_list = [];
  var person_count = 0;

  while (true) {
    if (url !== "undefined") {
      let html = getHTML(url);

      let table = await html.then(function (html) {
        let tbody = $(html).find("tbody").html();
        if (typeof tbody !== "undefined") {
          let tableHtml = "<tbody>" + tbody + "</tbody>";

          $(tableHtml)
            .find("tr")
            .each(function () {
              // Extract person and rating detailt from each row
              let person = $(this).find(".name").attr("href");
              if (person !== user_movie[0]) {
                let ratingClass = $(this).find(".rating").attr("class") || "";
                let match = ratingClass.match(/rated-(\d+)/);
                if (match) {
                  rating_list.push(parseInt(match[1], 10));
                }
              }
            });
        } else {
        }

        // check for the link to the next page
        let nextPageLoc = $(html).find(".next").parent().html();
        let nextPage = $(nextPageLoc).attr("href");

        // Return data and next page URL
        return [nextPage, rating_list, person_count];
      });

      if (typeof table[0] == "undefined") {
        if (table[1].length === 0) {
          break;
        } else {
          return table[1];
        }
      } else {
        url = "https://letterboxd.com" + table[0];
      }
    }
  }
  return [];
};

// Fetches the number of friends who liked the film by paginating through the likes page.
let getLikeCount = async (likesUrl) => {
  let count = 0;
  let url = likesUrl;

  while (url) {
    let html = await getHTML(url);
    let $html = $(html);
    count += $html.find(".person-summary").length;

    let nextPageLoc = $html.find(".next").parent().html();
    let nextPage = $(nextPageLoc).attr("href");
    url = nextPage ? "https://letterboxd.com" + nextPage : null;
  }

  return count;
};

// Prepares the content for the histogram display.
// Calculates ratings, averages, and generates the HTML structure for the histogram.
// @param {Array} table - An array containing the next page URL, rating list, person count, and like count.
// @param {Array<string>} user_movie - An array containing the username and movie title.

let prepContent = function (table, user_movie) {
  // Extract the rating list and count the number of votes
  rating_list = table[1];
  votes = rating_list.length;

  // Calculate the average rating
  if (votes === 0) {
    avg_1 = "–.–";
    avg_2 = "–.–";
  } else {
    let sum = 0;
    for (var r of rating_list) {
      sum += r;
    }
    avg = sum / (votes * 2);
    avg_1 = avg.toFixed(1);
    avg_2 = avg.toFixed(2);
  }

  // Prepare URLs and tooltip data
  href_head = `${user_movie[0]}friends/film/${user_movie[1]}`;
  href_likes = `${user_movie[0]}friends/film/${user_movie[1]}/likes/`;

  if (votes === 1) {
    rating = "rating";
  } else {
    rating = "ratings";
  }

  data_popup = `Average of ${avg_2} based on ${votes} ${rating}`;

  // Initialize an array to hold the count of each rating value
  let rating_count = [];
  for (let i = 1; i < 11; i++) {
    let count = 0;
    for (rating of rating_list) {
      if (rating === i) {
        count += 1;
      }
    }
    rating_count.push(count);
  }

  // Find the maximum rating count to normalize the bar heights (0–1 scale)
  let max_rating = Math.max(...rating_count);

  // Calculate percentage of votes for each rating
  let percent_rating = [];
  for (let rc of rating_count) {
    let percentage = votes > 0 ? Math.round((rc / votes) * 100) : 0;
    percent_rating.push(percentage);
  }

  // Array of star labels matching Letterboxd's rating values 1–10
  const stars = [
    "half-★",
    "★",
    "★½",
    "★★",
    "★★½",
    "★★★",
    "★★★½",
    "★★★★",
    "★★★★½",
    "★★★★★",
  ];

  // Build tooltip strings and table rows for each rating
  let rat = [];
  let rows = "";
  for (let i = 0; i < 10; i++) {
    const ratingTerm = rating_count[i] === 1 ? "rating" : "ratings";
    const ratingString = `${rating_count[i]} ${stars[i]} ${ratingTerm} (${percent_rating[i]}%)`;
    rat.push(ratingString);

    // --value is the normalized height (0 to 1), matching Letterboxd's new chart format
    const value = max_rating > 0 ? rating_count[i] / max_rating : 0;
    rows += `
      <tr class="column" style="--value: ${value}">
        <th scope="row" class="_sr-only">${stars[i]}</th>
        <td class="cell">
          <a href="${href_head}" id="a${i + 1}" class="barcolumn tooltip" data-original-title="${ratingString}">
            <span class="_sr-only">${rating_count[i]} (${percent_rating[i]}%)</span>
            <span class="bar"><span class="fill"></span></span>
          </a>
        </td>
      </tr>`;
  }

  // Build the full section HTML matching Letterboxd's current structure
  let str = `
    <section class="section ratings-histogram-chart" id="friends-rating-section">
      <style>#friends-rating-section .glyph.stars path { fill: #cba6f7; }</style>
      <header class="section-header -divider -spaced-loose">
        <h2 class="section-heading -omitdivider heading">
          <a href="${href_head}">Friends' Rating</a>
        </h2>
        <aside class="aside">
          <div class="section-accessories">
            <a href="${href_likes}" class="accessory">${table[3] === 1 ? "1 like" : `${table[3]} likes`}</a>
          </div>
        </aside>
      </header>
      <div class="rating-histogram">
        <div class="layout">
          <svg xmlns="http://www.w3.org/2000/svg" role="graphics-symbol" class="glyph stars -start -rating" width="9" height="9" viewBox="0 0 9 9" aria-label="★"><title>★</title><path transform="translate(0, 0)" fill-rule="evenodd" d="M5.065.45c-.22-.61-.95-.59-1.14 0l-.75 2.57H.705c-.73 0-.96.62-.37 1.07l1.99 1.53-.76 2.49c-.22.73.34 1.16.93.71l2-1.53 2 1.53c.59.45 1.15.02.93-.71l-.76-2.49 1.99-1.53c.59-.45.39-1.07-.33-1.07h-2.48z"></path></svg>
          <table class="chart">
            <caption class="_sr-only">Friends Rating Distribution</caption>
            <thead class="_sr-only">
              <tr><th scope="col">Rating</th><th scope="col">Count</th></tr>
            </thead>
            <tbody class="plot">
              ${rows}
            </tbody>
          </table>
          <svg xmlns="http://www.w3.org/2000/svg" role="graphics-symbol" class="glyph stars -end -rating" width="49" height="9" viewBox="0 0 49 9" aria-label="★★★★★"><title>★★★★★</title><path transform="translate(0, 0)" fill-rule="evenodd" d="M5.065.45c-.22-.61-.95-.59-1.14 0l-.75 2.57H.705c-.73 0-.96.62-.37 1.07l1.99 1.53-.76 2.49c-.22.73.34 1.16.93.71l2-1.53 2 1.53c.59.45 1.15.02.93-.71l-.76-2.49 1.99-1.53c.59-.45.39-1.07-.33-1.07h-2.48z"></path><path transform="translate(10, 0)" fill-rule="evenodd" d="M5.065.45c-.22-.61-.95-.59-1.14 0l-.75 2.57H.705c-.73 0-.96.62-.37 1.07l1.99 1.53-.76 2.49c-.22.73.34 1.16.93.71l2-1.53 2 1.53c.59.45 1.15.02.93-.71l-.76-2.49 1.99-1.53c.59-.45.39-1.07-.33-1.07h-2.48z"></path><path transform="translate(20, 0)" fill-rule="evenodd" d="M5.065.45c-.22-.61-.95-.59-1.14 0l-.75 2.57H.705c-.73 0-.96.62-.37 1.07l1.99 1.53-.76 2.49c-.22.73.34 1.16.93.71l2-1.53 2 1.53c.59.45 1.15.02.93-.71l-.76-2.49 1.99-1.53c.59-.45.39-1.07-.33-1.07h-2.48z"></path><path transform="translate(30, 0)" fill-rule="evenodd" d="M5.065.45c-.22-.61-.95-.59-1.14 0l-.75 2.57H.705c-.73 0-.96.62-.37 1.07l1.99 1.53-.76 2.49c-.22.73.34 1.16.93.71l2-1.53 2 1.53c.59.45 1.15.02.93-.71l-.76-2.49 1.99-1.53c.59-.45.39-1.07-.33-1.07h-2.48z"></path><path transform="translate(40, 0)" fill-rule="evenodd" d="M5.065.45c-.22-.61-.95-.59-1.14 0l-.75 2.57H.705c-.73 0-.96.62-.37 1.07l1.99 1.53-.76 2.49c-.22.73.34 1.16.93.71l2-1.53 2 1.53c.59.45 1.15.02.93-.71l-.76-2.49 1.99-1.53c.59-.45.39-1.07-.33-1.07h-2.48z"></path></svg>
          <a href="${href_head}" id="a11" class="averagerating tooltip" data-original-title="${data_popup}">${avg_1}</a>
        </div>
      </div>
      <div class="twipsy fade above in" id="popup1" style="display: none">
        <div id="popup2" class="twipsy-arrow" style="left: 50%;"></div>
        <div id="aad" class="twipsy-inner"></div>
      </div>
    </section>`;

  let html = $.parseHTML(str);
  injectContent(html);
  return true;
};

// Injects the prepared HTML content into the sidebar.
let injectContent = function (html) {
  path = $(".sidebar");
  $(html).appendTo(path);

  return true;
};

// Calculates the width of tooltip elements to adjust their position dynamically.
let getWidths = async () => {
  // List of IDs for tooltip elements
  const ids = ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "a10"];
  let widths = [];

  // Temporarily show the popup to measure tooltip widths
  $("#popup1").css({
    display: "block",
    top: "-3px",
    left: "-10px",
  });

  // Measure width for each tooltip
  for (const id of ids) {
    const elementId = `#${id}`;
    const text = $(elementId).attr("data-original-title") || $(elementId).text();
    $("#aad").text(text);
    const width = $("#aad").width();
    widths.push(width);
  }

  // Measure width for the special tooltip (#a11)
  const specialText = $("#a11").attr("data-original-title") || $("#a11").data("popup");
  $("#aad").text(specialText);
  const specialWidth = $("#aad").width();
  widths.push(specialWidth);

  // Hide the popup after measurement
  $("#popup1").css("display", "none");

  return widths;
};

// Main function to coordinate fetching and displaying ratings.
//Calls other functions to gather data and inject the histogram into the page.
//@returns {Promise<Array<number>|undefined>} - A promise that resolves with the widths of tooltips.

let main = async () => {
  var user_movie = await getinfo();
  if (user_movie !== null && typeof user_movie !== "undefined") {
    var user = user_movie[0];
    var movie = user_movie[1];
    let ratingsURL = "https://letterboxd.com" + user + "friends/film/" + movie;
    let likesURL = "https://letterboxd.com" + user + "friends/film/" + movie + "/likes/";

    browser.runtime.sendMessage({ content: ratingsURL });

    let [rating_list, like_count] = await Promise.all([
      getContent(ratingsURL, user_movie),
      getLikeCount(likesURL),
    ]);

    if (rating_list && rating_list.length > 0) {
      prepContent([null, rating_list, 0, like_count], user_movie);
      let widths = await getWidths();
      return widths;
    }
  }
};

// Run the main function.
widths = main();

var ids = ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "a10", "a11"];

// Event listener for mouse movement to display tooltips with ratings information.
// Adjusts the position of the tooltip based on the hovered element.

document.addEventListener(
  "mousemove",
  function (e) {
    const element = e.srcElement;
    const singleId = $(element).attr("id");
    // Use closest() to find the nearest ancestor with a matching ID (handles nested spans inside <a>)
    const closestId = $(element).closest("[id]").attr("id");
    const activeId = ids.includes(singleId) ? singleId : (ids.includes(closestId) ? closestId : null);

    // Check if the hovered element is one of the rating bars or the special element
    if (activeId) {
      let text, position, arrow;
      let liNumber;
      const $active = $("#" + activeId);

      if (activeId === "a11") {
        text = $active.attr("data-original-title") || $active.data("popup");
        liNumber = 11;
        position = -((Number(widths[liNumber - 1]) * 3) / 4) + 190;
        arrow = "left: 145px";
      } else {
        text = $active.attr("data-original-title") || $active.text();
        liNumber = Number(activeId.replace("a", ""));
        position = -(Number(widths[liNumber - 1]) / 2) + liNumber * 16 - 7.5;
        arrow = "left: 50%";
      }

      // Display the tooltip with calculated position and text
      $("#popup1").attr(
        "style",
        `display: block; top: -3px; left: ${position}px;`
      );
      $("#popup2").attr("style", arrow);
      $("#aad").text(text);
    } else {
      // Hide the tooltip if the hovered element is not relevant
      $("#popup1").attr("style", "display: none");
    }
  },
  false
);
