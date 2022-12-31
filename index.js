// load in puppeteer
const puppeteer = require('puppeteer')
const { BrowserFetcher } = require('puppeteer-core')

let deptlinks = [];


/*
 steps of the web scraping:
 - get dept names and links to their course listings
 - each dept name has an associated list of courses offered
 - each course has an associated list of availabilities
 - some courses can be split into 2+ sub-courses, like a lecture and a tutorial
     - idk how to handle this, will consider later

how to represent this as a csv:
 - each row is a course section with its name, start, end, Prereqs, Coreqs, and type
*/


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

        const newPage = await browser.newPage();

        let crs = [''];

        for (const link of deptdata) {

            let url = "https://courses.students.ubc.ca" + link;

            await newPage.goto(url);

            const contents = await newPage.evaluate(() => {
                let courselinks = [];
                // scrape department courses
                let courses = document.querySelectorAll("#mainTable > tbody > tr");
                courses.forEach((course) => {
                    let c = $($(course).children().first()).children().first().attr("href")
                    if (c) {
                        courselinks.push(c)
                    }
                })

                return courselinks;
            });

            crs.push(contents);

            
        }

        console.log(crs);


        // get course section data
        

        const thirdPage = await browser.newPage();

        let sects = [];

        for (const course of crs) {
            for (const link of course) {
                let url = "https://courses.students.ubc.ca" + link;

                await thirdPage.goto(url);

                const contents = await thirdPage.evaluate(() => {
                    let sectionlinks = [];

                    let sections = document.querySelectorAll("body > div.container > div.content.expand > table.table.table-striped.section-summary > tbody > tr");

                    sections.forEach((section) => {
                        let s = $($(section).children().first().next()).children().first().attr('href');
        
                        if (s) {
                            sectionlinks.push(s)
                        }
                    })
                    

                    return sectionlinks;
                })

                sects.push(contents)
            }
            
        } 

        console.log(sects);

        
        
        await browser.close()
        
    } catch (error) {
        console.log(error)
    }
})()
