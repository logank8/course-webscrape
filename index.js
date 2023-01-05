// load in puppeteer
const puppeteer = require('puppeteer')
const { BrowserFetcher } = require('puppeteer-core')
const fs = require('fs')

let deptlinks = [];


/*
 steps of the web scraping:
 - get dept names and links to their course listings
 - each dept name has an associated list of courses offered
 - each course has an associated list of availabilities
 - some courses can be split into 2+ sub-courses, like a lecture and a tutorial
     - idk how to handle this, will consider later
     - need to also handle waiting lists

how to represent this as a csv:
 - each row is a course section with its name, start, end, Prereqs, Coreqs, and type
*/


// immediately executes this code
void (async () => {
    

    try {
        // new browser instance
        const browser = await puppeteer.launch({headless: false})

        // create a page in the browser
        const page = await browser.newPage()

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

        // get course section links
        

        const thirdPage = await browser.newPage();

        let sects = [];

        for (const course of crs) {
            for (const link of course) {
                let url = "https://courses.students.ubc.ca" + link;

                await thirdPage.goto(url);

                let contents = await thirdPage.evaluate(() => {
                    let sectionlinks = [];

                    let sections = document.querySelectorAll("body > div.container > div.content.expand > table.table.table-striped.section-summary > tbody > tr");

                    sections.forEach((section) => {
                        let s = $($(section).children().first().next()).children().first().attr('href');
        
                        if (s) {
                            sectionlinks.push(s)
                        }
                    })

                    return sectionlinks
                })

                sects.push(contents)

            }
            
        } 

        console.log(sects);

        // get section data

        let init = [{
            dept: 'INIT',
            course: 'INIT',
            sect: 'INIT',
            term: 'INIT',
            day: 'INIT',
            start: 'INIT',
            end: 'INIT'
        }]

        const i = JSON.stringify(init)

        fs.writeFile('./section.json', i, 'utf8', err => {
            if (err) {
                console.log('Error writing file')
            } else {
                console.log('File written successfully')
            }
        })

        const fourthPage = await browser.newPage();


        for (const section of sects) {
            for (const link of section) {
                let url = "https://courses.students.ubc.ca" + link;

                await fourthPage.goto(url);

                let trimmed = link.substring(58, link.length)
                let dept = trimmed.substring(0, trimmed.indexOf('&'))

                let trimmed1 = trimmed.substring(trimmed.indexOf('&') + 8, trimmed.length)
                let course = trimmed1.substring(0, trimmed1.indexOf('&'))

                let sect = trimmed1.substring(trimmed1.indexOf('=') + 1, trimmed1.length)

                const [one, two, three, four]= await fourthPage.evaluate(() => {

                    let body = $('.table.table.table-striped').children().first().next()
        
                    var term = ' ';
                    var day = '';
                    var start = ' ';
                    var end = ' ';
                    
                    $($(body).children().children()).each(function(i) {
                        switch (i) {
                            case 0:
                                term = term + $(this).text();
                                break;
                            case 1:
                                day = day + $(this).text();
                                break;
                            case 2:
                                start = start + $(this).text();
                                break;
                            case 3:
                                end = end + $(this).text();
                                
                        }
                        
                    })
        
                    return [
                        term,
                        day,
                        start,
                        end
                    ];
         
                })
        

                fs.readFile('./section.json', 'utf8', (err, data) => {
                    if (err) {
                        console.log("error reading file")
                    } else {

                        const section = JSON.parse(data);

                        section.push({
                            dept: dept,
                            course: course,
                            sect: sect,
                            term: one,
                            day: two,
                            start: three,
                            end: four
                        })

                        fs.writeFile('./section.json', JSON.stringify(section, null, 7), err => {
                            if (err) {
                                console.log('error writing file')
                            }
                        })
                    } 
                    
                })

            }
        }
        
        await browser.close()
        
    } catch (error) {
        console.log(error)
    }
})()
