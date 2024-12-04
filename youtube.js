import $ from "jquery";
export async function getLangOptionsWithLink(videoId) {
    try {
      // Get the video page HTML
      const videoPageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
      const videoPageHtml = await videoPageResponse.text();
      
      // Extract captions JSON data from the page HTML
      const captionsData = videoPageHtml.split('"captions":')[1]?.split(',"videoDetails')[0];
      if (!captionsData) return []; // No captions available
  
      const captionsJson = JSON.parse(captionsData.replace('\n', ''));
      const captionTracks = captionsJson.playerCaptionsTracklistRenderer.captionTracks;
  
      // Map and sort language options
      const languageOptions = captionTracks.map(track => track.name.simpleText);
      languageOptions.sort((x, y) => {
        if (x.includes('English')) return -1;
        if (y.includes('English')) return 1;
        return x.localeCompare(y);
      });
  
      // Return language options with links
      return languageOptions.map(langName => {
        const link = captionTracks.find(track => track.name.simpleText === langName).baseUrl;
        return { language: langName, link };
      });
    } catch (error) {
        throw error;
    }
  }
  
  export async function getTranscript(langOption) {
    try {
      const rawTranscript = await getRawTranscript(langOption.link);
      return rawTranscript.map(item => item.text).join(' ');
    } catch (error) {
        throw error;
    }
  }
  
  export async function getRawTranscript(link) {
    try {
      // Get transcript XML
        const transcriptPageResponse = await fetch(link); // default 0
        const transcriptPageXml = await transcriptPageResponse.text();

        // Parse Transcript
        const jQueryParse = $.parseHTML(transcriptPageXml);
        const textNodes = jQueryParse[1].childNodes;

        return Array.from(textNodes).map(i => {
            return {
            start: i.getAttribute("start"),
            duration: i.getAttribute("dur"),
            text: i.textContent
            };
        });
    } catch (error) {
        throw error;
    }
  }
  
  export async function fetchTranscript(videoId) {
    try {
      // Step 1: Get language options and links
      const languageOptions = await getLangOptionsWithLink(videoId);
      if (languageOptions.length === 0) {
        throw new Error('No captions available for this video.')
      }
  
      // Step 2: Select a language (e.g., English)
    //   const selectedLang = languageOptions.find(lang => (lang.language === 'English' || lang.language === 'English (auto-generated)')); // Adjust if needed
    //   if (!selectedLang) {
    //     console.log("English subtitles not available.");
    //     return;
    //   }
  
      // Step 3: Get the full transcript
      const transcript = await getTranscript(languageOptions?.[0]);
      return { transcript: transcript, language: languageOptions?.[0]?.language }
    } catch (error) {
      throw error;
    }
  }
  
 export function parseVideoIdFromCurrentURL() {
    const currentURL = window.location.href;
    
    // Check if the domain is youtube.com
    const urlObj = new URL(currentURL);
    if (urlObj.hostname !== 'www.youtube.com' && urlObj.hostname !== 'youtube.com') {
      throw new Error('The URL is not from youtube.com');
    }
    
    // Extract the 'v' parameter
    const urlParams = new URLSearchParams(urlObj.search);
    const videoId = urlParams.get('v');
    
    if (!videoId) {
      throw new Error('The Page does not contain the video player.');
    }
    
    return videoId;
  }