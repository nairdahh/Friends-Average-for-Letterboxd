// Delay
let sleep = function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};



// Function to fetch the HTML content of a given URL.
let getHTML = function (url) {
    return fetch(url).then(result => { 
        return result.text();
    });
};



// Asynchronous function to retrieve the username and movie from the current Letterboxd page.
// Continuously checks the page until the necessary elements are found.
let getinfo = async () => {
    var main_nav = $('.main-nav').html();
    if (typeof main_nav == 'undefined') {
        // If main navigation is not found, wait and try again.
        await sleep(100);
        return getinfo();
    } else {
        let movie_link = $('meta[property="og:url"]').attr('content');
        url_part = movie_link.split('film/')[1].split('/')[1];
        let exclude = ['members', 'likes', 'reviews', 'ratings', 'fans', 'lists'];
        if (!exclude.includes(url_part)) {
            let movie = movie_link.match('(?<=film\/)(.*?)(?=\/)')[0];
            let user_link = $('a:contains("Profile")').parent().html();
            let user = $(user_link).attr('href');
            if (typeof user !== 'undefined') {
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
    var like_count = 0;

    while (true) {
        if (url !== 'undefined') {
            
            let html = getHTML(url);

            let table = await html.then(function (html) {
                
                let tbody = $(html).find('tbody').html();

                if (typeof tbody !== 'undefined') {
                    
                    let tableHtml = '<tbody>' + tbody + '</tbody>';

                    $(tableHtml).find('tr').each(function () {
                        // Extract person and rating detailt from each row
                        let person = $(this).find(".name").attr('href');
                        if (person !== user_movie[0]) {
                            let rating = $(this).find(".rating").attr('class');
                            person_count += 1;

                            let like = $(this).find('.icon-liked').html();
                            if (typeof like !== 'undefined') {
                                like_count += 1;
                            }

                            if (typeof rating !== 'undefined') {
                                rating = rating.split('-')[1];
                                rating_list.push(Number(rating));
                            }
                        }
                    });
                } else {
                    
                }

                // check for the link to the next page
                let nextPageLoc = $(html).find('.next').parent().html();
                let nextPage = $(nextPageLoc).attr('href');

                // Return data and next page URL                
                return [nextPage, rating_list, person_count, like_count];
            });

            if (typeof table[0] == 'undefined') {
                
                if (table[1].length === 0 && table[3] === 0) {
                    
                    break; // Exit loop if no ratings of likes
                } else {
                    
                    prepContent(table, user_movie);
                    return true;
                }
            } else {
                 //Update URL for next page
                url = 'https://letterboxd.com' + table[0];
            }
        }
    }
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
        avg_1 = '–.–'; // Placeholder
        avg_2 = '–.–'; // Placeholder
    } else {
        let sum = 0;
        // Sum up all the ratings
        for (var r of rating_list) {
            sum += r;
        }
        // Compute the average rating and format it
        avg = sum / (votes * 2);
        avg_1 = avg.toFixed(1); // One decimal place
        avg_2 = avg.toFixed(2); // Two decimal places
    }

    
    // Prepare URLs and tooltip data
    href_head = `${user_movie[0]}friends/film/${user_movie[1]}`;
    href_likes = `${user_movie[0]}friends/film/${user_movie[1]}/likes/`;
    
    if (votes === 1) {
        rating = 'rating';
    } else {
        rating = 'ratings';
    }
    
    data_popup = `Average of ${avg_2} based on ${votes} ${rating}`;

    // Initialize an array to hold the count of each rating value
    let rating_count = [];
    for (let i = 1; i < 11; i++) {
        let count = 0;
        // Count the number of occurrences for each rating value
        for (rating of rating_list) {
            if (rating === i) {
                count += 1;
            }
        }
        rating_count.push(count);
    }

    // Find the maximum rating count to normalize the heights
    let max_rating = Math.max(...rating_count);
    
    // Initialize arrays to hold relative heights and percentage ratings
    let relative_rating = [];
    let percent_rating = [];

    // Calculate the relative height for each rating bar and percentage rating
    for (rating of rating_count) {
        let height = (rating / max_rating) * 44.0;
        // Ensure the height is not less than 1 and is finite
        if (height < 1 || height === Number.POSITIVE_INFINITY || isNaN(height)) {
            height = 1;
        }
        relative_rating.push(height);

        // Calculate the percentage of votes for each rating
        let percentage = Math.round((rating / votes) * 100);
        percent_rating.push(percentage);
    }



    // Array to store the formatted rating strings
    let rat = [];

    // Array of star ratings
    const stars = [
        'half-★', '★', '★½', '★★', '★★½', '★★★', '★★★½', '★★★★', '★★★★½', '★★★★★'
    ];

    // Iterate through rating counts and build the rating strings
    for (let i = 0; i < 10; i++) {
        // Determine the correct term based on the rating count
        const ratingTerm = (rating_count[i] === 1) ? 'rating' : 'ratings';

        // Create the formatted rating string
        const ratingString = `${rating_count[i]} ${stars[i]} ${ratingTerm} (${percent_rating[i]}%)`;

        // Add the formatted string to the array
        rat.push(ratingString);
    }


    // Build HTML structure for the histogram.

    // Section with heading and links
    let str1 = `
    <section class="section ratings-histogram-chart">
        <h2 class="section-heading">
            <a href="" id="aaa" title="">Friends' Rating</a>
        </h2>
        <a href="" id="aab" class="all-link more-link"></a>
        <span class="average-rating" itemprop="aggregateRating" itemscope="" itemtype="http://schema.org/AggregateRating">
            <a href="" id="a11" class="tooltip display-rating -highlight" data-popup=""></a>
        </span>
        <div class="rating-histogram clear rating-histogram-exploded">
        <span class="rating-green rating-green-tiny rating-1">
            <span class="rating rated-2">★</span>
        </span>
        <ul>
    `;

    // Histogram bars
    let str2 = `
            <li id="li1" class="rating-histogram-bar" style="width: 15px; left: 0px">
                <a href="" id="a1" class="ir tooltip"></a>
            </li>
            <li id="li2" class="rating-histogram-bar" style="width: 15px; left: 16px">
                <a href="" id="a2" class="ir tooltip"></a>
            </li>
            <li id="li3" class="rating-histogram-bar" style="width: 15px; left: 32px">
                <a href="" id="a3" class="ir tooltip"></a>
            </li>
            <li id="li4" class="rating-histogram-bar" style="width: 15px; left: 48px">
                <a href="" id="a4" class="ir tooltip"></a>
            </li>
            <li id="li5" class="rating-histogram-bar" style="width: 15px; left: 64px">
                <a href="" id="a5" class="ir tooltip"></a>
            </li>
            <li id="li6" class="rating-histogram-bar" style="width: 15px; left: 80px">
                <a href="" id="a6" class="ir tooltip"></a>
            </li>
            <li id="li7" class="rating-histogram-bar" style="width: 15px; left: 96px">
                <a href="" id="a7" class="ir tooltip"></a>
            </li>
            <li id="li8" class="rating-histogram-bar" style="width: 15px; left: 112px;">
                <a href="" id="a8" class="ir tooltip"></a>
            </li>
            <li id="li9" class="rating-histogram-bar" style="width: 15px; left: 128px">
                <a href="" id="a9" class="ir tooltip"></a>
            </li>
            <li id="li10" class="rating-histogram-bar" style="width: 15px; left: 144px">
                <a href="" id="a10" class="ir tooltip"></a>
            </li>
        </ul>
        <span class="rating-green rating-green-tiny rating-5">
            <span class="rating rated-10">★★★★★</span>
        </span>
        </div>
    `;

    // Tooltip popup
    let str3 = `
        <div class="twipsy fade above in" id="popup1" style="display: none">
        <div id="popup2" class="twipsy-arrow" style="left: 50%;"></div>
        <div id="aad" class="twipsy-inner"></div>
        </div>
    </section>
    `;

    // Combine all parts
    let str = str1 + str2 + str3;

    // Parse the HTML string into a jQuery object
    let html = $.parseHTML(str);

    // Update links and text content for specific elements
    const updateLinksAndText = function() {
        // Set href attributes
        $(html).find('#aaa').attr('href', href_head);
        $(html).find('#aab').attr('href', href_likes);
        $(html).find('#a11').attr({
            'href': href_head,
            'data-popup': data_popup
        });

        // Set text content for likes
        let likeText = (table[3] === 1) ? '1 like' : `${table[3]} likes`;
        $(html).find('#aab').text(likeText);
        $(html).find('#a11').text(avg_1);
    };

    // Update ratings histogram bars
    const updateHistogramBars = function() {
        for (let i = 1; i <= 10; i++) {
            let id = `#a${i}`;
            let barHeight = relative_rating[i - 1];
            let barText = rat[i - 1];
            let barIcon = `<i id="i${i}" style="height: ${barHeight}px;"></i>`;

            $(html).find(id).attr('href', href_head).text(barText).append($.parseHTML(barIcon));
        }
    };

    // Execute update functions
    updateLinksAndText();
    updateHistogramBars();

    // Inject the updated HTML content into the page
    injectContent(html);
    return true;
};



// Injects the prepared HTML content into the sidebar.
let injectContent = function (html) {
    
    path = $('.sidebar');
    $(html).appendTo(path);
    
    return true;
};



// Calculates the width of tooltip elements to adjust their position dynamically.
let getWidths = async () => {
    // List of IDs for tooltip elements
    const ids = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10'];
    let widths = [];

    // Temporarily show the popup to measure tooltip widths
    $('#popup1').css({
        'display': 'block',
        'top': '-3px',
        'left': '-10px'
    });

    // Measure width for each tooltip
    for (const id of ids) {
        const elementId = `#${id}`;
        const text = $(elementId).text();
        $('#aad').text(text);
        const width = $('#aad').width();
        widths.push(width);
    }

    // Measure width for the special tooltip (#a11)
    const specialText = $('#a11').data('popup');
    $('#aad').text(specialText);
    const specialWidth = $('#aad').width();
    widths.push(specialWidth);

     // Hide the popup after measurement
    $('#popup1').css('display', 'none');
    
    return widths;
};




    // Main function to coordinate fetching and displaying ratings.
    //Calls other functions to gather data and inject the histogram into the page.
    //@returns {Promise<Array<number>|undefined>} - A promise that resolves with the widths of tooltips.

let main = async () => {
    
    var user_movie = await getinfo();
    if (user_movie !== null && typeof user_movie !== 'undefined') {
    
        var user = user_movie[0];
        var movie = user_movie[1];
        let newURL = 'https://letterboxd.com' + user + 'friends/film/' + movie;
    
        browser.runtime.sendMessage({ content: newURL });
        let promise = await getContent(newURL, user_movie);
        let widths = await getWidths();
        return widths;
    } else {
    
    }
};


// Run the main function.
widths = main();

var ids = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10', 'a11'];




// Event listener for mouse movement to display tooltips with ratings information.
// Adjusts the position of the tooltip based on the hovered element.

document.addEventListener('mousemove', function (e) {
    const element = e.srcElement;
    const singleId = $(element).attr('id');
    const parentId = $(element).parent().attr('id');

    // Check if the hovered element is one of the rating bars or the special element
    if (ids.includes(parentId) || ids.includes(singleId)) {
        let text, position, arrow;
        let liNumber;

        if (singleId === 'a11') {
            text = $(element).data('popup');
            liNumber = 11;
            position = -(Number(widths[liNumber - 1]) * 3 / 4) + 190;
            arrow = "left: 145px";
        } else {
            text = $(element).text() || $(element).parent().text();
            liNumber = Number(singleId.replace('a', '')) || Number(parentId.replace('a', ''));
            position = -(Number(widths[liNumber - 1]) / 2) + (liNumber * 16) - 7.5;
            arrow = "left: 50%";
        }

        // Display the tooltip with calculated position and text
        $('#popup1').attr('style', `display: block; top: -3px; left: ${position}px;`);
        $('#popup2').attr('style', arrow);
        $('#aad').text(text);
    } else {
        // Hide the tooltip if the hovered element is not relevant
        $('#popup1').attr('style', 'display: none');
    }
}, false);