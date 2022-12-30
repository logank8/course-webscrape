// load in puppeteer
const puppeteer = require('puppeteer')
const { BrowserFetcher } = require('puppeteer-core')

let deptlinks = [];
let courselinks = [];

/*
 steps of the web scraping:
 - get dept names and links to their course listings
 - each dept name has an associated list of courses offered
 - each course has an associated list of availabilities
 - some courses can be split into 2+ sub-courses, like a lecture and a tutorial
     - idk how to handle this, will consider later

how to represent this as a csv:
 - adjacency-matrix-esque setup map[dept name (represented by index maybe)][course #] 
 - dept name has a corresponding map<string, int> giving index
 - course # has a corresponding map<int, index> giving index
 - entry will have False if dne, else will have either a sub-division of some form of requirements or a list of availabilities
*/


async function visitLink(page, link) {

    // create new browser ?
    

    await page.goto(link);

    let coursedata = await page.evaluate(() => {
        // scrape department courses
        let courses = document.querySelectorAll("#mainTable > tbody > tr");
        

        courses.forEach((course) => {
            let c = $($(course).children().first()).children().first().attr("href")
            if (c) {
                courselinks.push(c)
            }
        })

        return courselinks;
    })

    console.log(coursedata);
}


// immediately executes this code
void (async () => {
    

    try {
        console.log('start')

        // new browser instance
        const browser = await puppeteer.launch({headless: false})
        console.log('launched')

        // create a page in the browser
        const page = await browser.newPage()
        console.log('done')

        // navigate
        await page.goto('https://courses.students.ubc.ca/cs/courseschedule?pname=subjarea&tname=subj-all-departments')
        console.log('nav')

        let deptdata = await page.evaluate(() => {
            let deptlinks = [];

            let items = document.querySelectorAll("#mainTable > tbody > tr");
            items.forEach ((item) => {


                let i = $($(item).children().first()).children().first().attr('href')
                if (i) {
                    deptlinks.push(i);
                }
            })

            return deptlinks;
        });

        console.log(deptdata);

        let newPage = await browser.newPage();

        deptdata.forEach ((i) => {
            let link = "https://courses.students.ubc.ca" + i;

            visitLink(newPage, link).then(
                function(value) {console.log(courselinks);},
                function(error) {console.log(error);}
            );
        })


        await browser.close()
        
    } catch (error) {
        console.log(error)
    }
})()


