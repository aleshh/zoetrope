$(function() {

  var scope = 'movie';
  var currentSearch = '';
  var $results = $('#results');

  //
  // Basic interface event handlers
  //

  // activate media type switcher
  $('.media-select').on('click', function() {
    $('.media-select-menu').toggle();
  });

  // select media type
  $('.media-type').on('click', function() {
    $('.media-select-menu').toggle();

    // this.id is 'movie', 'book', or 'game', so we can use it directly:
    $('.media-select-text').text(this.id);
    scope = this.id;

    // clear results and search box
    $results.html('');
    defaultResults();

    $('#main-search-text').val('').focus();

  });

  //
  // Functions for working with MH API
  //

  var releaseYear = function(releaseDate) {
    if (!releaseDate) return null;

    var date = new Date(releaseDate);
    return date.getFullYear();
  };

  // returns html for one item for the search results page
  var generatePreview = function(media) {
    var caption = media.metadata.name;

    var year = releaseYear(media.metadata.releaseDate);
    if (year) caption += ', ' + year;

    // quick n dirty title truncation
    if (caption.length > 40) {
      caption = caption.substr(0, 37) + ' …';
    }

    var $div = $('<div>').attr({
      class: 'preview',
      id: media.metadata.mhid
    });
    var $image = $('<img>').attr('src', media.primaryImage.metadata.small.url);
    var $caption = $('<p>').text(caption);
    $div.append($image).append($caption);

    return $div;
  };

  // register call handlers for serach results
  var registerHandlers = function() {
    $('.preview').on('click', function(event) {
      event.stopPropagation();
      displayDetail(this.id);
    });
  };

  // generate default results
  var defaultResults = function() {

    $results.html('');

    houndjs.MHSearch.fetchTopResults([scope], 20)
    .then(function(response) {

      for (var i = 0; i < 20; i++) {
        var result = response.content[i].object;
        $results.append(generatePreview(result));
      }

      registerHandlers();

    });
  };

  var displayDetail = function(mhid) {
    houndjs.MHObject.fetchByMhid(mhid)
      .then(function(response) {
        console.log(response);

        // setup
        $('.smoke').show();
        $itemDetail = $('.item-detail');

        $itemDetail.show();

        // display image
        $('<img>').attr({
         src: response.primaryImage.metadata.large.url,
         class: 'detail-image'
        }).appendTo($itemDetail);

        // display name, year, and description
        $('<h1>').text(response.metadata.name).appendTo($itemDetail)
        $('<p>').text(releaseYear(response.metadata.releaseDate)).appendTo($itemDetail);
        $('<p>').text(response.metadata.description).appendTo($itemDetail);

        var cast = [];

        // list out all the contributors with their function, save actors for later
        response.keyContributors.forEach(function(contributor) {
          contributor.context.relationships.forEach(function(relationship) {
            if (relationship.contribution == 'Cast') {

              var actor = '<a href="#">';
              // changing all the spaces to nonbreaking
              actor += contributor.object.metadata.name.replace(/\s/g, '&nbsp;');
              actor += '</a>';
              cast.push(actor);
            } else {

              var $current = $('<p>').addClass('contributor');

              var title; // we're going to do something special for authors
              if (relationship.contribution.toLowerCase() == 'author') {
                title = 'by ';
              } else {
                title = relationship.contribution + ': ';
              }
              $current.html(title + contributorLink(contributor.object.metadata.name));
              // $current.html(title + '<a href="#">' +
              //               contributor.object.metadata.name + '</a>');
              $current.appendTo($itemDetail);

            }
          });
        });

        // display actors
        if (cast.length > 0){
          var wholeCast = 'Cast: ' + cast.join(', ');
          $('<p>').html(wholeCast).appendTo($itemDetail);
        }

        // event handler for close (click X or background)
        $('.item-detail-close').add($('.smoke')).on('click', function() {
          $('.smoke').hide();
          // adding the close button back in like this is dumb but here we go:
          $itemDetail.hide().html('<div class="item-detail-close">×</div>');
          location = "#" + currentSearch;
        });
      });

      location = '#' + mhid;
  };

  var contributorLink = function(name) {
    var context = '#' + 'search-' + scope + '-';
    var link = '<a href="'+ context + name +'">';
    // changing all the spaces to nonbreaking
    link += name.replace(/\s/g, '&nbsp;');
    link += '</a>';
    return link;
  }

  var searchMh = function(entry) {
    houndjs.MHSearch.fetchResultsForSearchTerm(entry, [scope], 20)
      .then(function(response) {

        $results.html('');
        window.scrollTo(0, 0);

        if (response.content.length == 0) {
          $results.text('No results.');
        } else {
          var length = (response.content.length < 20) ? response.content.length : 20;

          for (var i = 0; i < length; i++) {
            var result = response.content[i].object;
            $results.append(generatePreview(result));
          }

          registerHandlers();
        }

      });

  };

  // connect to API
  houndjs.MHSDK.configure('mhclt_Zoetrope', 'xq6E9hf7wy0VToG02CffHElTvXUHdcN5CYInaGGrWpJwhbaT')
    .then(function() {

      var followedLink = location.hash.slice(1);

      if (followedLink) {

        if(followedLink.slice(0,6) == 'search') {

          switch(followedLink.slice(7,8)) {
            case 'm':
              scope = 'movie';
              followedLink = followedLink.slice(13);
              break;
            case 'b':
              scope = 'book';
              followedLink = followedLink.slice(12);
              break;
            case 'g':
              scope = 'game';
              followedLink = followedLink.slice(12);
              break;
          }

          $('.media-select-text').text(scope);
          $('#main-search-text').val(followedLink);
          searchMh(followedLink);


        } else {

          // not sure if MH has a way to test if an mhid is valid
          // this is a working but ugly substitute

          try {
            houndjs.MHObject.fetchByMhid(followedLink)
              .then(function(response) {
                defaultResults();
                displayDetail(followedLink);
              });
          }

          // if the URL hash isn't a valid MHID, we'll treat it as a search term;
          // that way if it's a mangled MHID they'll get an error message anyway
          catch(error) {

            $('#main-search-text').val(followedLink);
            searchMh(followedLink);
          }
        }
      } else {
        defaultResults();
      }

      $('#main-search-text').on('change paste keyup', function() {
        $('.media-select-menu').hide();
        var entry = $(this).val();

        if (entry) {
          location = '#' + 'search-' + scope + '-' + entry;
          currentSearch = entry;
          searchMh(entry);
        } else {
          // location = '';
          defaultResults();
        }
      });
    });
});