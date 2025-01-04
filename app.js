/* 
Version V1.5
- Daily MCQs count
- Mock History
*/

//(function () {
const firebaseConfig = {
    apiKey: "AIzaSyBJA35C49-PGhTYOLq6M2WCogPrAf4N1Xo",
    authDomain: "siljuapp-4c428.firebaseapp.com",
    projectId: "siljuapp-4c428",
    storageBucket: "siljuapp-4c428.appspot.com",
    messagingSenderId: "577085941993",
    appId: "1:577085941993:web:85460382e9e73d29a12878",
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

var base_data_ref = `elahi_study_app/${exam}`;

// General variables
var exam = "ssc";
var is_online = navigator.onLine;
var is_mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
var subjects = {
    ssc: ["general studies", "english", "aptitude", "reasoning"],
    neet: ["biology", "physics", "chemistry"],
    upsc: ["polity", "economy", "geography", "history", "environment", "int_relations"],
};

//notes data
let is_testing = window.location.href.indexOf("5501") !== -1;

//start
var load_url = "";
var base_data_ref = `elahi_study_app/${exam}`;
let temp_app_data = {};
let temp_userdata = {};
//start
async function loadApp() {
    // save the page load url to check for shared items
    load_url = window.location.href;
    if (/\/mocks\/shared_mock\/.+/.test(load_url)) {
        popupAlert("Shared Mock Test URL found;The shared mock will be run once app loading is compeleted.;  ;Mock Test Loading...", 10);
    } else if (/\/mcq\/filter-mcqs\/.+/.test(load_url)) {
        popupAlert("Shared Filtered MCQs URL found; ;Filtered MCQs Loading ...", 10);
    }

    // check for new app version
    let app_version = localStorage.getItem("esa_app_version");
    if (!app_version || app_version != "elahi_new_app_v1.2") {
        localStorage.clear();
        localStorage.setItem("esa_app_version", "elahi_new_app_v1.2");
    }

    app_version = "Version 1.6 [ Jan 4th 2025 ]";
    document.querySelector(".app-version").textContent = app_version;

    // Set the exam based on local storage or URL parameter
    exam = "ssc";
    document.querySelector(".home-page-inner .top-bar .exam-name").textContent = exam.toUpperCase();
    //popupAlert("App loaded for " + exam.toUpperCase(), 3, "green");

    // Set base_ref based on exam.
    base_data_ref = `elahi_study_app/${exam}`;
    await loadData(); // It will load data from Local Storage

    app_data = temp_app_data;
    userdata = temp_userdata;
    que_data = app_data.mcqs ? app_data.mcqs : [];

    // add me-overlays
    let overlays = document.createElement("div");
    overlays.className = "me-overlays";
    document.body.appendChild(overlays);

    // If a shared mcq is there show that first and load other things in background
    if (/\/mcq\/[^/]+$/.test(load_url)) {
        let id = load_url.substring(load_url.lastIndexOf("/") + 1);
        if (id !== "") {
            openMCQInFullScreen(getQuestionById(id));
        }
    }

    openTab("home"); // To set the home page url
    loadMCQsPage();

    if (userdata != {}) {
        openTab("mcq");
    }
    // After the app loads, get upldate the local app data from firebase
    await getUpdatedAppDataFromFirebase();
    let ele = document.querySelector(".main-content .page.mcq .sub-pages .sub-page.all-mcqs .mcq-div");

    // This will run when the user opens the app for the first time from a shared link
    if (!ele) {
        loadMCQsPage();
    }

    // if the url has filtered-mcqs then apply the filters
    if (/\/mcq\/filter-mcqs\/.+/.test(load_url)) {
        let tags_string = load_url.substring(load_url.lastIndexOf("/") + 1);
        let tags = tags_string.split("__");
        tags = tags.map((tag) => tag.replace("_", " "));
        let operator = tags.pop().toLowerCase();

        let applied_filters = { tags: tags, operator: operator };
        applyFilterInMCQs(applied_filters);
        removePopupAlert();
        return; // return since the all-mcqs sub-pag
    }

    // SHARED MOCK TEST
    // if the load url has shared mock test
    // If shared mock test is there, run the mock test before the mock page laoding.
    // As the mock test will run in a new popup, so no need to load the mock page.
    // if the url has filtered-mcqs then apply the filters
    // 1. check if load url is shared_mock url
    // 2. if yes get the if of the shared mock test and fetch it from firebase
    // 3. then start a new mock test.

    if (/\/mocks\/shared_mock\/.+/.test(load_url)) {
        let mock_id = load_url.substring(load_url.lastIndexOf("/") + 1);
        let ref = database.ref(`${base_data_ref}/shared_mocks`);
        let data = await getDataFromFirebaseUsingRef(ref);
        data = data ? data : [];

        let mock_obj = data.find((item) => item.id === mock_id);
        removePopupAlert();
        if (mock_obj) startNewMockTest(mock_obj);
    }

    // Loading at the end to avoid slow loading
    loadMocksPage();
}

loadApp();

function loadHomePage() {
    return;
}

function installAppActivation() {
    let deferredPrompt;

    window.addEventListener("beforeinstallprompt", (e) => {
        // Prevent the default mini-infobar
        e.preventDefault();
        // Save the event for later use
        deferredPrompt = e;
        // Show the custom install button
        document.querySelector("#install-btn").style.display = "block";
    });

    document.querySelector("#install-btn").addEventListener("click", () => {
        if (deferredPrompt) {
            deferredPrompt.prompt(); // Show the install prompt
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === "accepted") {
                    console.log("User accepted the PWA install");
                } else {
                    console.log("User dismissed the PWA install");
                }
                deferredPrompt = null; // Reset the deferred prompt
            });
        }
    });
}

function shareExamLink(exam_name, event) {
    const url = `https://elahistudyapp.com/${exam_name}/home`;

    if (is_mobile && navigator.share) {
        copyTextToClipboard(url); // Fallback to copy URL to clipboard
        popupAlert("Link copied to clipboard");
        navigator
            .share({
                title: "Share Current Question",
                url: url,
            })
            .then(() => {
                console.log("Link shared successfully");
                popupAlert("Link shared successfully");
            })
            .catch((error) => {
                console.error("Error sharing link:", error);
                copyTextToClipboard(url); // Fallback to copy URL to clipboard
                popupAlert("Link copied to clipboard");
            });
        //takeScreenshot(que_div);
    } else {
        // Fallback for browsers that do not support Web Share API
        copyTextToClipboard(url); // Copy URL to clipboard
        popupAlert("Question Link copied");
    }
}

function loadMCQsPage() {
    if (que_data.length === 0) {
        console.log("que_data is empty");
        return;
    }
    filtered_mcqs = que_data.slice(0, 50);
    if (userdata.applied_filters && Object.keys(userdata.applied_filters).length > 0) {
        applyFilterInMCQs(userdata.applied_filters);
        return; // return since the all-mcqs sub-page is already opened by applyFilterInMCQs()
    }
    displayFilteredMCQs();
}

function loadSearchMCQsByTextSection(event) {
    let div = document.querySelector(".main-content .pages .page.mcq .sub-pages .sub-page.search-mcqs .search-mcqs-inner");
    if (div) return;
    div = document.querySelector(".main-content .pages .page.mcq .sub-pages .sub-page.search-mcqs");
    ReactDOM.render(<ShowSearchMCQsByTextSectionHTML />, div);
}

function ShowSearchMCQsByTextSectionHTML() {
    return (
        <div className="search-mcqs-inner block h-full max-h-[calc(100vh-120px)] overflow-y-scroll w-full">
            <div className="block  h-[50px] w-full">
                <div className="flex justify-center items-center gap-2 px-2 py-1">
                    <div className="flex justify-center items-center h-full w-full border rounded-full p-2">
                        <i className="bi bi-search text-xl px-2 text-gray-500"></i>
                        <input type="search" className="w-full text-sm border-0 outline-none" placeholder="Search MCQs by text" />
                    </div>
                    <button className="bg-blue-500 text-white rounded-md text-sm  w-[80px] p-2" onClick={(event) => searchMCQsByText(event)}>
                        Search
                    </button>
                </div>
            </div>
            <div className="search-mcqs-result-list-header block h-[60px] w-full px-3 py-1">
                <div className="flex justify-center items-center gap-2">
                    <button className="text-blue-500 border border-blue-500 rounded-md text-sm px-2 py-1" onClick={(event) => searchMCQsByText(event, "all")}>
                        ALL
                    </button>
                    <button className="text-blue-500 border border-blue-500 rounded-md text-sm px-2 py-1" onClick={(event) => searchMCQsByText(event, "question")}>
                        Question Only
                    </button>
                    <button className="text-blue-500 border border-blue-500 rounded-md text-sm px-2 py-1" onClick={(event) => searchMCQsByText(event, "options")}>
                        Options Only
                    </button>
                </div>
                <span className="text-sm text-gray-500 searched-mcqs-count"></span>
            </div>
            <div className="block h-full w-full max-h-[calc(100vh-235px)] overflow-y-scroll border-t search-mcqs-result-list">
                <div className="flex justify-center items-center h-full w-full">
                    <span className="text-sm text-gray-500"> No any searched MCQs found</span>
                </div>
            </div>
        </div>
    );
}

function searchMCQsByText(event, type) {
    let search_text = event.target.closest(".search-mcqs-inner").querySelector("input").value;
    if (search_text.trim() == "") {
        popupAlert("Please enter a search text", 3, "red");
        return;
    }

    //let searched_mcqs_que = que_data.filter((mcq) => mcq.question.toLowerCase().includes(search_text.toLowerCase()));
    //let searched_mcqs_options = que_data.filter((mcq) => mcq.options.some((option) => option.toLowerCase().includes(search_text.toLowerCase())));
    var all_searched_mcqs = [];
    let count_ele = document.querySelector(".page.mcq .sub-page.search-mcqs .searched-mcqs-count");

    if (type == "question") {
        all_searched_mcqs = que_data.filter((mcq) => {
            const queryWords = search_text.toLowerCase().split(" "); // Split input by spaces
            const mcqQuestion = mcq.question.toLowerCase();
            return queryWords.every((word) => mcqQuestion.indexOf(word) != -1);
        });
        count_ele.textContent = `Total ${all_searched_mcqs.length} MCQs found for text: "${search_text}", in questions`;
    } else if (type == "options") {
        all_searched_mcqs = que_data.filter((mcq) => {
            const queryWords = search_text.toLowerCase().split(" "); // Split input by spaces

            const mcqOptions = mcq.options.map((option) => option.toLowerCase());
            const mcqOptionsString = mcqOptions.join(" ");

            return queryWords.every((word) => mcqOptionsString.indexOf(word) != -1);
        });
        count_ele.textContent = `Total ${all_searched_mcqs.length} MCQs found for text: "${search_text}", in options`;
    } else {
        all_searched_mcqs = que_data.filter((mcq) => {
            const queryWords = search_text.toLowerCase().split(" "); // Split input by spaces
            const mcqQuestion = mcq.question.toLowerCase();
            const mcqOptions = mcq.options.map((option) => option.toLowerCase());
            const mcqOptionsString = mcqOptions.join(" ");
            const fullString = mcqQuestion + " " + mcqOptionsString;

            // Check if all words in the query exist in the mock name, in order
            return queryWords.every((word) => fullString.indexOf(word) != -1);
        });
        count_ele.textContent = `Total ${all_searched_mcqs.length} MCQs found for text: "${search_text}"`;
    }

    if (all_searched_mcqs.length == 0) {
        popupAlert("No any searched MCQs found", 3, "red");
        return;
    }
    let target_div = document.querySelector(".main-content .pages .page.mcq .sub-pages .sub-page.search-mcqs .search-mcqs-result-list");
    if (target_div) emptyReactContainer(target_div);

    //let div = document.querySelector(".main-content .pages .page.mcq .sub-pages .sub-page.search-mcqs .search-mcqs-result-list");
    ReactDOM.render(<ShowSearchedMCQsHTML all_searched_mcqs={all_searched_mcqs} />, target_div);
}

function ShowSearchedMCQsHTML({ all_searched_mcqs }) {
    return (
        <div className="block h-full w-full max-h-[calc(100vh-175px)] overflow-y-scroll search-mcqs-result-list">
            {all_searched_mcqs.map((mcq, index) => {
                return (
                    <div key={index} className="block searched-mcq-div h-full w-full">
                        <GetMCQHTML que={mcq} index={index} type="searched-mcq" is_show_icons={true} is_show_tags={true} selected_option_id={null} search_text={null} />
                    </div>
                );
            })}
        </div>
    );
}

function loadFilterMCQsSection() {
    let ele = document.querySelector(".main-content .pages .page.mcq .sub-pages .sub-page.filter-mcqs .selected-tags-list");
    if (ele) {
        // add the applied filters tags
        displayAppliedFiltersInFilterMCQsSection();
        return;
    } else {
        let interval = setInterval(() => {
            let ele = document.querySelector(".main-content .pages .page.mcq .sub-pages .sub-page.filter-mcqs");
            if (ele) {
                clearInterval(interval);
                displayAppliedFiltersInFilterMCQsSection();
                return;
            }
        }, 100);
    }
    if (all_tags_object.length == 0) loadAllTags();
    // Initially whenFilterMCQsSection is not loaded then load it for the first time.
    let div = document.querySelector(".main-content .pages .page.mcq .sub-pages .sub-page.filter-mcqs");
    ReactDOM.render(<FilterMCQsSectionHTML />, div);
}

function displayAppliedFiltersInFilterMCQsSection() {
    userdata.applied_filters = userdata.applied_filters ? userdata.applied_filters : {};
    saveUserData();
    let filtered_tags = userdata.applied_filters.tags ? userdata.applied_filters.tags : [];
    let filtered_subjects = userdata.applied_filters.subjects ? userdata.applied_filters.subjects : [];

    if (filtered_tags.length !== 0) {
        let ele = document.querySelector(".main-content .pages .page.mcq .sub-pages .sub-page.filter-mcqs .selected-tags-list");
        ele.innerHTML = "";
        let operator = userdata.applied_filters.operator ? userdata.applied_filters.operator : "or";
        filtered_tags.forEach((tag) => {
            addTagInTheSelectedTagsSectionOfFilterMCQs(tag);
        });
        // First remove active class from active operator and then add active class to the operator
        ele.closest(".selected-tags-section").querySelector(".and-or-operation .active").classList.remove("active");
        ele.closest(".selected-tags-section")
            .querySelector(".and-or-operation ." + operator)
            .classList.add("active");
        return;
    }

    if (filtered_subjects.length !== 0) {
        filtered_subjects.forEach((subject) => {
            let ele = document.querySelector(".main-content .pages .page.mcq .sub-pages .sub-page.filter-mcqs .subject-div .subject." + subject.toLowerCase().replace(" ", "_"));
            if (ele) ele.classList.add("active");
        });
    }
}

function FilterMCQsSectionHTML() {
    let mcq_types = ["shared", "verified", "unverified"];

    let interval = setInterval(() => {
        let ele = document.querySelector(".main-content .pages .page.mcq .sub-pages .sub-page.filter-mcqs .selected-tags-list");
        if (ele) {
            clearInterval(interval);

            // Clear the selected tags and add applied  filter tags
            ele.innerHTML = "";

            userdata.applied_filters = userdata.applied_filters ? userdata.applied_filters : {};
            saveUserData();
            let filtered_tags = userdata.applied_filters.tags ? userdata.applied_filters.tags : [];
            let filtered_subjects = userdata.applied_filters.subjects ? userdata.applied_filters.subjects : [];

            if (filtered_tags.length !== 0) {
                let operator = userdata.applied_filters.operator ? userdata.applied_filters.operator : "or";
                filtered_tags.forEach((tag) => {
                    addTagInTheSelectedTagsSectionOfFilterMCQs(tag);
                });
                // First remove active class from active operator and then add active class to the operator
                ele.closest(".selected-tags-section").querySelector(".and-or-operation .active").classList.remove("active");
                ele.closest(".selected-tags-section")
                    .querySelector(".and-or-operation ." + operator)
                    .classList.add("active");
            }

            //loadSubjectWiseTagsForFilterMCQs(ele);
            return;
        }
    }, 100);
    return (
        <div className="container filter-mcq-overlay-inner block h-full w-full max-h-[calc(100vh-130px)] overflow-y-scroll">
            <div className="block h-full w-full mx-2 my-4">
                <div className="flex justify-center items-center gap-2 px-3 h-full w-full">
                    <span className="text-[15px] font-bold hide">Filter MCQs</span>
                    <button className="bg-blue-500 text-white rounded-md text-sm px-4 py-3 w-full ml-auto mr-[15px] text-md font-semibold" onClick={(event) => applyFilterInMCQs(event)}>
                        Apply Filter
                    </button>
                </div>
            </div>
            <div className=" block subject-div h-full w-full overflow-x-auto py-2 px-3">
                <span className="h-full w-full font-semibold">Filter MCQs by Subject:</span>
                <div className="flex space-x-4 py-2 ">
                    <span
                        className={`subject all 
                                    ${userdata.applied_filters && userdata.applied_filters.subjects && userdata.applied_filters.subjects.includes("all") ? "active" : ""} 
                                    inline-flex items-center whitespace-nowrap 
                                    border h-full min-w-[fit-content] text-gray-500 rounded-md px-2 py-1 cursor-pointer`}
                        onClick={(event) => {
                            //filterMcqsByTag("all", event)
                            event.target.closest(".subject").classList.toggle("active");
                            document.querySelector(".page.mcq .selected-tags-list").innerHTML = "";
                        }}
                    >
                        All
                    </span>
                    {subjects[exam].map((subject, index) => (
                        <span
                            key={index} // Add a key for each child in the list
                            // Add active class if the subject is in the applied filters subjects array
                            className={` subject 
                                         ${subject.toLowerCase().replace(" ", "_")} 
                                         ${userdata.applied_filters && userdata.applied_filters.subjects && userdata.applied_filters.subjects.includes(subject) ? "active" : ""} 
                                         inline-flex items-center whitespace-nowrap 
                                         border h-full min-w-[fit-content] text-gray-500 rounded-md px-2 py-1 cursor-pointer`}
                            onClick={(event) => {
                                event.target.closest(".subject").classList.toggle("active");
                                document.querySelector(".page.mcq .selected-tags-list").innerHTML = "";
                            }}
                        >
                            {capitalFirstLetterOfEachWord(subject)}
                        </span>
                    ))}
                </div>
                <div className="flex justify-start items-start gap-2 mr-auto">
                    <i className="bi bi-info-circle text-sm text-gray-400 w-[20px]"></i>
                    <span className="text-sm text-gray-400">When subject is selected, then selected tags (if any) will be ignored for filtering MCQs</span>
                </div>
            </div>

            <div className="block filter-by-tags h-full w-full mt-5">
                <div className="flex flex-col justify-start items-start w-full  px-3 ">
                    <span className="block h-auto py-2 border-t w-full font-semibold">Filter MCQs by Tags or Chapters or Category:</span>

                    <div className="block h-full w-full selected-tags-section my-4 bg-violet-100 px-3 py-2 rounded-md">
                        <div className="flex justify-center items-center gap-2 h-full w-full py-1 my-2">
                            <span className="mr-auto text-gray-700"> Selected Tags:</span>
                            <div className="and-or-operation flex justify-center items-center gap-2 mr-4">
                                <span
                                    className="cursor-pointer active text-sm or"
                                    onClick={(event) => {
                                        switchAndOrOperators("or", event);
                                    }}
                                >
                                    OR
                                </span>
                                <span
                                    className="cursor-pointer  text-sm and"
                                    onClick={(event) => {
                                        switchAndOrOperators("and", event);
                                    }}
                                >
                                    {" "}
                                    AND
                                </span>
                            </div>
                        </div>
                        <div className="selected-tags-list flex justify-start items-center flex-wrap gap-2 my-2"></div>
                        <span className="text-sm text-gray-500 filtered-mcq-count h-full w-full py-2"></span>
                        <button className=" hide bg-gray-500 text-white  rounded-md px-2 py-2 cursor-pointer h-full my-2 w-full text-sm" onClick={(event) => filterMcqsBySelectedTags(event)}>
                            filter mcqs by selected tags
                        </button>
                        <div className="block share-filtered-mcqs w-full h-full my-4">
                            <div className="flex justify-start items-start gap-2 w-full h-full link cursor-pointer" onClick={(event) => createFilteredMCQsURL(event)}>
                                <i className="bi bi-share"></i>
                                <span className="text-sm">Share Filtered MCQs</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center items-center gap-2  h-auto py-2  w-full">
                        <div className="flex justify-center items-center gap-2  w-full rounded-md px-2 py-1 border border-gray-500 ">
                            <i className="bi bi-funnel"></i>
                            <input type="text" className="filter-mcq-input p-1 align-middle focus:outline-none text-sm" placeholder="Search for tags and chapters" onKeyUp={(event) => filterMcqTagItemsByInput(event)} />
                        </div>
                    </div>
                </div>
                <div className="block h-full w-full">
                    <div className="flex flex-col justify-center items-center gap-2 h-full w-full">
                        <div className="flex justify-center items-center gap-2 w-full px-4 py-3">
                            <span className="text-gray-500  text-md font-semibold text-no-wrap w-full">Tags and Chapters</span>
                            <div className="icons flex justify-end items-center gap-2 w-full ml-auto mr-[20px] link">
                                <i className="bi bi-sort-alpha-down text-xl cursor-pointer" onClick={(event) => sortAllTags("az")}></i>
                                <i className="bi bi-sort-alpha-down-alt text-xl cursor-pointer" onClick={(event) => sortAllTags("za")}></i>
                                <i className="bi bi-sort-numeric-down text-xl cursor-pointer" onClick={(event) => sortAllTags("19")}></i>
                                <i className="bi bi-sort-numeric-down-alt text-xl cursor-pointer" onClick={(event) => sortAllTags("91")}></i>
                            </div>
                        </div>
                        <div className="all-tags-list block h-full w-full p-2 ">{LoadAllTagsHTML()}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function createFilteredMCQsURL(event) {
    let selected_tags = [];
    let selected_tags_section = event.target.closest(".selected-tags-section");
    let selected_tags_elements = selected_tags_section.querySelector(".selected-tags-list").querySelectorAll(".tag-item .tag-name");
    selected_tags_elements.forEach((tag) => {
        tag = tag.textContent.toLowerCase().trim();
        tag = tag.replaceAll(" ", "_");
        selected_tags.push(tag);
    });
    let operator = selected_tags_section.querySelector(".and-or-operation .active").innerText.trim();
    let tags_string = selected_tags.join("__");
    tags_string += "__" + operator;

    let url = window.location.href + "/" + tags_string;
    console.log(url);
    navigator.clipboard.writeText(url);
    popupAlert("Filtered MCQs URL copied to clipboard", 3, "green");
}

function sortAllTags(type) {
    if (type === "az") {
        // Sort by tag name A-Z
        all_tags_object.sort((a, b) => a.name.localeCompare(b.name));
    } else if (type === "za") {
        // Sort by tag name Z-A
        all_tags_object.sort((a, b) => b.name.localeCompare(a.name));
    } else if (type === "19") {
        // Sort by tag count 1-9 (ascending)
        all_tags_object.sort((a, b) => a.count - b.count);
    } else if (type === "91") {
        // Sort by tag count 9-1 (descending)
        all_tags_object.sort((a, b) => b.count - a.count);
    }

    let div = document.querySelector(".main-content .pages .page.mcq .sub-pages .sub-page.filter-mcqs .all-tags-list");
    emptyReactContainer(div);
    ReactDOM.render(<LoadAllTagsHTML />, div);
}

function applyFilterInMCQs(object) {
    let selected_subjects_ele = document.querySelectorAll(".page.mcq .sub-page.filter-mcqs .subject-div .subject.active");
    let selected_subjects_array = [];
    if (object && object.subjects) selected_subjects_array = object.subjects;

    if (selected_subjects_ele.length !== 0 || selected_subjects_array.length !== 0) {
        selected_subjects_ele.forEach((subject) => {
            selected_subjects_array.push(subject.innerText.toLowerCase().trim());
        });
        let applied_filter = {
            subjects: selected_subjects_array,
        };
        if (selected_subjects_array.includes("all")) {
            filtered_mcqs = que_data.map((mcq) => mcq.id);
        } else {
            let arr = que_data.filter((mcq) => mcq.tags.some((tag) => selected_subjects_array.includes(tag)));
            filtered_mcqs = arr.map((mcq) => mcq.id);
        }
        //applied_filter.mcqs = filtered_mcqs;
        userdata.applied_filters = applied_filter;
        saveUserData();
        openSubPage("mcq", "all-mcqs", null);
        filtered_mcqs = sortArrayRandomly(filtered_mcqs);
        displayFilteredMCQs();
        return;
    }

    // If no subject is selected, the check for selected tags

    let selected_tags = document.querySelectorAll(".page.mcq .sub-page.filter-mcqs .selected-tags-section .tag-item .tag-name");
    let selected_tags_array = [];
    selected_tags.forEach((tag) => {
        selected_tags_array.push(tag.textContent.toLowerCase().trim());
    });
    if (object && object.tags) selected_tags_array = object.tags;

    if (selected_tags_array.length !== 0) {
        let operator = document.querySelector(".page.mcq .sub-page.filter-mcqs .selected-tags-section .and-or-operation .active");
        if (operator) operator = operator.innerText.trim();
        else if (object && object.operator) operator = object.operator;

        operator = operator.toLowerCase();

        let applied_filter = {
            tags: selected_tags_array,
            operator: operator,
        };

        filtered_mcqs = [];
        if (operator == "and") {
            que_data.forEach((que) => {
                if (selected_tags_array.every((tag) => que.tags.includes(tag))) {
                    filtered_mcqs.push(que.id);
                }
            });
        } else {
            que_data.forEach((que) => {
                if (que.tags.some((tag) => selected_tags_array.includes(tag))) {
                    filtered_mcqs.push(que.id);
                }
            });
        }

        if (filtered_mcqs.length == 0) {
            popupAlert("No any MCQs found for the selected tags; Note: change 'AND' with 'OR' operation", 6, "red");
            return;
        }

        //applied_filter.mcqs = filtered_mcqs;
        userdata.applied_filters = applied_filter;
        saveUserData();
        openSubPage("mcq", "all-mcqs", null);
        filtered_mcqs = sortArrayRandomly(filtered_mcqs);
        displayFilteredMCQs();
    }
}

function filterMcqsBySelectedTags(event) {
    let selected_tags_section = event.target.closest(".selected-tags-section");
    let selected_tags = selected_tags_section.querySelector(".selected-tags-list").querySelectorAll(".tag-item .tag-name");
    let selected_tags_array = [];

    selected_tags.forEach((tag) => {
        selected_tags_array.push(tag.textContent.toLowerCase().trim());
    });
    let all_selected_tags = [];

    selected_tags_array.forEach((tag) => {
        let tag_array = getAllChildTags(tag);
        if (!tag_array.includes(tag)) tag_array.push(tag);
        all_selected_tags = [...all_selected_tags, ...tag_array];
    });

    for (let i = 0; i < all_selected_tags.length; i++) {
        all_selected_tags[i] = all_selected_tags[i].replace("[[", "").replace("]]", "");
        all_selected_tags[i] = all_selected_tags[i].toLowerCase();
    }

    let operator = selected_tags_section.querySelector(".and-or-operation .active").innerText.trim();
    let mcqs = [];
    if (operator == "AND") {
        que_data.forEach((mcq) => {
            if (all_selected_tags.every((tag) => mcq.tags.includes(tag))) {
                mcqs.push(mcq);
            }
        });
    } else {
        que_data.forEach((mcq) => {
            if (mcq.tags.some((tag) => all_selected_tags.includes(tag))) {
                mcqs.push(mcq);
            }
        });
    }

    if (mcqs.length == 0) {
        popupAlert("No any MCQs found for the selected tags; Note: change 'AND' with 'OR' operation", 6, "red");
        return;
    }

    filtered_mcqs = mcqs;
    if (!userdata.filtered_mcqs) userdata.filtered_mcqs = [];
    userdata.filtered_mcqs = filtered_mcqs;
    saveUserData();
    openSubPage("mcq", "all-mcqs", null);
    sortArrayRandomly(filtered_mcqs);
    displayFilteredMCQs();
}

function sortArrayRandomly(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function switchAndOrOperators(operator, event) {
    let and_or_operation = event.target.closest(".and-or-operation");
    and_or_operation.querySelector("span.active").classList.remove("active");
    event.target.classList.add("active");
    updateFilteredMCQsCount();
}

function loadSubjectWiseTagsForFilterMCQs(target_div) {
    //let target_div = document.querySelector(".main-content .pages .page.mcq .sub-pages .sub-page.filter-mcqs .tab-section .subject-wise.tab-container");
    let level = 0;
    tags_list.forEach((tag_item) => {
        addSubjectWiseMqcTagItem(tag_item, target_div, level);
    });
    function addSubjectWiseMqcTagItem(tag_item, target_div, level) {
        tag_item = tag_item[0] ? tag_item[0] : tag_item;
        let div = document.createElement("div");

        target_div.appendChild(div);
        ReactDOM.render(<ChapterWiseMcqTagItemHTML tag_item={tag_item} level={level} />, div);

        tag_item.children = tag_item.children ? tag_item.children : [];
        if (tag_item.children.length > 0) {
            tag_item.children.forEach((child) => {
                let target_div = div.querySelector(".children");
                addSubjectWiseMqcTagItem(child, target_div, level + 1);
            });
        }
    }
}

function ChapterWiseMcqTagItemHTML({ tag_item, level }) {
    tag_item = tag_item[0] ? tag_item[0] : tag_item;
    let paddingClass = "";
    if (level === 1) {
        paddingClass = "pl-2";
    } else if (level === 2) {
        paddingClass = "pl-4";
    } else if (level === 3) {
        paddingClass = "pl-6";
    } else {
        paddingClass = ""; // Default or no padding
    }
    //let regex = /\[\[(.*?)\]\]/;
    //let tag_name = tag_item.name ? tag_item.name.replace("[[", "").replace("]]", " ") : "";
    let tag_name = tag_item.name.replace("[[", "").replace("]]", " ");
    return (
        <div className={`tag-item level-${level} ${paddingClass} flex flex-col gap-2`}>
            <div
                className={`main-tag flex justify-start items-center gap-1 cursor-pointer px-2 ${subjects[exam].includes(tag_name.toLowerCase()) ? "bg-gray-200 rounded-md py-2" : ""}`}
                onClick={(event) => {
                    addTagInTheSelectedTagsSectionOfFilterMCQs(tag_name.toLowerCase());
                }}
            >
                <i className="fa-solid fa-circle link hide text-7px opacity-70"></i>
                <span className="tag-name text-no-wrap link text-sm">{capitalFirstLetterOfEachWord(tag_name)}</span>
            </div>
            <div className="children"></div>
        </div>
    );
}

function updateFilteredMCQsCount(page, page_class) {
    if (page == "mock") return;

    let selected_tags_section = document.querySelector(".page.mcq .sub-page.filter-mcqs .selected-tags-section");
    let selected_tags = selected_tags_section.querySelector(".selected-tags-list").querySelectorAll(".tag-item");
    let selected_tags_array = [];
    selected_tags.forEach((tag) => {
        selected_tags_array.push(tag.querySelector(".tag-name").innerText.trim());
    });

    let operator = selected_tags_section.querySelector(".and-or-operation .active").innerText.trim();
    let mcqs = [];
    if (operator == "AND") {
        que_data.forEach((mcq) => {
            if (selected_tags_array.every((tag) => mcq.tags.includes(tag))) {
                mcqs.push(mcq);
            }
        });
    } else {
        que_data.forEach((mcq) => {
            if (mcq.tags.some((tag) => selected_tags_array.includes(tag))) {
                mcqs.push(mcq);
            }
        });
    }
    let message = `Total <span class="text-blue-500">${mcqs.length} MCQs </span> found for the selected tags using ${operator} operation`;
    if (mcqs.length == 0) message = `No any MCQs found for the selected tags using ${operator} operation`;
    selected_tags_section.querySelector(".filtered-mcq-count").innerHTML = message;
}

function selectSubjectForMock(subject, event) {
    let subject_div = event.target.closest(".subject-div");
    let subjects = subject_div.querySelectorAll(".subject");
    let is_already_active = event.target.closest(".subject").classList.contains("active");
    subjects.forEach((subject) => {
        subject.classList.remove("active");
    });
    if (!is_already_active) event.target.closest(".subject").classList.add("active");
}

function switchFilterMCQsTabs(tab_name, event) {
    let tag_section = event.target.closest(".tab-section");
    let tabs = tag_section.querySelectorAll(".tab");
    tabs.forEach((tab) => {
        tab.classList.remove("active");
    });
    event.target.closest(".tab").classList.add("active");

    let tab_containers = tag_section.querySelectorAll(`.tab-container`);
    tab_containers.forEach((tab_container) => {
        tab_container.classList.add("hide");
    });
    tag_section.querySelector(`.tab-container.${tab_name}`).classList.remove("hide");
}

function SubjectWiseTagsHTML() {
    return <div>Subject Wise Tags</div>;
}

var all_tags_object = [];
function loadAllTags() {
    // Create a temporary map to store tags and their counts
    const tagMap = new Map();

    app_data.mcqs.forEach((mcq) => {
        mcq.tags.forEach((tag) => {
            const tagName = tag.toLowerCase();
            if (tagMap.has(tagName)) {
                // Increment the count if tag already exists
                tagMap.set(tagName, tagMap.get(tagName) + 1);
            } else {
                // Add new tag with a count of 1
                tagMap.set(tagName, 1);
            }
        });
    });
    // Convert the map to the desired array of objects
    all_tags_object = Array.from(tagMap, ([name, count]) => ({ name, count }));
}
function LoadAllTagsHTML(from) {
    let ignore_tags = ["mock", "mcqs", "practice", "random", "random-mcq"];

    if (all_tags_object.length == 0) loadAllTags();
    return (
        <div className="all-tags-list-inner flex justify-start items-center gap-2 flex-wrap h-full max-h-[250px] overflow-y-scroll w-full px-2 py-4 mb-[20px] border-t">
            {all_tags_object.map((tag, index) => {
                if (ignore_tags.includes(tag.name)) return;
                return (
                    <div
                        key={index}
                        className="tag flex justify-center items-center gap-2 border border-blue-500 rounded-md px-2 py-1 cursor-pointer"
                        onClick={(event) => {
                            addTagInTheSelectedTagsSectionOfFilterMCQs(tag.name, event);
                        }}
                    >
                        <span className=" text-blue-500 name text-sm ">{tag.name}</span>
                        <span className="text-sm text-blue-500 count">{tag.count}</span>
                    </div>
                );
            })}
        </div>
    );
}

function addTagInTheSelectedTagsSectionOfFilterMCQs(tag, event) {
    let page = "";
    let page_class = "";

    if (!event) {
        page = "mcq";
        page_class = ".page.mcq";
    } else if (event.target.closest(".page.mocks")) {
        page = "mock";
        page_class = ".page.mocks";
    } else if (event.target.closest(".page.mcq")) {
        page = "mcq";
        page_class = ".page.mcq";
    }

    let selected_subjects_ele = document.querySelectorAll(`${page_class}  .subject-div .subject.active`);
    if (selected_subjects_ele) {
        selected_subjects_ele.forEach((ele) => {
            ele.classList.remove("active");
        });
    }

    let div = document.createElement("div");
    div.className = "tag-item border border-blue-500 rounded-md px-2 py-1 flex justify-center items-center gap-2";
    div.innerHTML = `
                                    <span class="tag-name text-sm link">${tag.toLowerCase()}</span>
                                    <i class="bi bi-x-circle link"></i>
                                    `;
    div.addEventListener("click", (event) => {
        div.remove();
        updateFilteredMCQsCount(event);
    });
    if (page === "mcq") {
        document.querySelector(".page.mcq .sub-page.filter-mcqs .selected-tags-list").appendChild(div);
    }
    if (page === "mock") {
        document.querySelector(".page.mocks .sub-page.new-mock .selected-tags-list").appendChild(div);
    }
    updateFilteredMCQsCount(page);
}

function loadBookmarkedMCQs(event) {
    let div = document.querySelector(".main-content .pages .page.mcq .sub-pages .sub-page.bookmarked-mcqs");
    if (div) emptyReactContainer(div); //div.innerHTML = "";
    ReactDOM.render(<ShowBookmarkedMCQsHTML />, div);
}
function emptyReactContainer(ele) {
    ReactDOM.unmountComponentAtNode(ele);
}
function ShowBookmarkedMCQsHTML() {
    userdata.bookmarked_questions = userdata.bookmarked_questions ? userdata.bookmarked_questions : [];
    return (
        <div className="bookmarked-mcqs-inner block h-full max-h-[calc(100vh-120px)] overflow-y-scroll w-full">
            <div className="block h-full w-full">
                <div className="flex justify-center items-center h-[30px] w-full">
                    <span className="text-lg font-semibold w-full  text-center">Saved MCQs</span>
                </div>
            </div>
            <div className="block h-full w-full max-h-[calc(100vh-150px)] overflow-y-scroll border-t-2 ">
                {userdata.bookmarked_questions.map((id, index) => {
                    return (
                        <div key={id} className="block h-full w-full bookmarked-mcq-div">
                            <GetMCQHTML que={id} index={index} type="bookmarked-mcq" is_show_icons={true} is_show_tags={true} selected_option_index={null} search_text={null} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function displayFilteredMCQs() {
    if (filtered_mcqs.length !== que_data.length) {
        document.querySelector(".page.mcq .icons .bi-funnel").classList.add("text-red-500");
    } else {
        document.querySelector(".page.mcq .icons .bi-funnel").classList.remove("text-red-500");
    }

    //if (userdata.filtered_mcqs) filtered_mcqs = userdata.filtered_mcqs;
    sortArrayRandomly(filtered_mcqs);

    let ele = document.querySelector(".main-content .pages .page.mcq .sub-pages .sub-page.all-mcqs");
    if (ele) emptyReactContainer(ele); //ele.innerHTML = "";
    ReactDOM.render(<ShowFilteredMCQsHTML />, ele);
}
function ShowFilteredMCQsHTML() {
    return (
        <div className="mcqs-container h-full w-full block  max-h-[calc(100vh-120px)] overflow-y-scroll">
            {filtered_mcqs.map((mcq, index) => {
                return (
                    <div key={index} className="mcq-que-div block h-full w-full">
                        <GetMCQHTML que={mcq} index={index} type="random-mcq" is_show_icons={true} is_show_tags={true} search_text={null} />
                    </div>
                );
            })}
        </div>
    );
}

function GetMCQHTML({ que, index, type, is_show_icons, is_show_tags, selected_option_index, search_text }) {
    const isValidIndex = (index) => [0, 1, 2, 3].includes(index);

    try {
        // When que is undefined
        if (!que) return <div className="mcq-error-div block"></div>;
        // To check if que is an object or an id
        que = que.id ? que : getQuestionById(que);

        // when que is not found or question text is not there
        if (!que || !que.question) return <div className="mcq-error-div block"></div>;
        let is_pyq = que.tags.includes("pyq");

        return (
            <div className="mcq-div block" key={index}>
                <div className="mcq-item  que-div border-b-2 border-gray-300 py-2 px-3" id={que.id}>
                    {is_pyq && type != "mock" && type != "mock-result" && (
                        <div className=" flex justify-start items-baseline gap-2 ">
                            <span className="text-sm text-green-500"> Asked in: </span>
                            <span className="text-sm text-gray-500">{que.exams[0]}</span>
                        </div>
                    )}
                    <div className="question py-2 text-md font-semibold flex justify-start items-baseline gap-2">
                        <span className={`text-md  que-num w-[30px] ${type == "mock" ? "" : "hide"}`}> {index ? `Q${index}.` : "Q."} </span>
                        <div className={`text-md  flex-1 flex flex-wrap`} dangerouslySetInnerHTML={{ __html: getHTMLFormattedText(que.question.replace("??", "")) }}></div>
                    </div>
                    <div className="options flex flex-col gap-2">
                        {que.options.map((option, index) => (
                            <div
                                key={index}
                                className={`flex justify-start  items-start gap-2  cursor-pointer option border bg-gray-100 rounded-md p-2  
                                ${que.correct_option_index === index ? "answer" : ""}
                                ${isValidIndex(selected_option_index) || type == "mock-result" ? "disabled" : ""}
                                ${isValidIndex(selected_option_index) && selected_option_index === index ? "selected" : ""}
                                ${isValidIndex(selected_option_index) && selected_option_index == index && index === que.correct_option_index ? "correct" : ""}
                                ${isValidIndex(selected_option_index) && selected_option_index == index && index !== que.correct_option_index ? "wrong" : ""}
                                ${isValidIndex(selected_option_index) && index === que.correct_option_index && index !== selected_option_index ? "correct" : ""}
                                `}
                                onClick={(event) => {
                                    if (que.correct_option_index === index) {
                                        // Pass click coordinates to blastCrackers
                                        const { clientX: x, clientY: y } = event;
                                        setTimeout(() => {
                                            blastCrackers(x, y);
                                        }, 500);
                                    }
                                    checkAnswer(event, que, type);
                                }}
                            >
                                <span className="text-sm option-index text-gray-400 ">{index + 1}.</span>
                                <span className="text-sm option-text" dangerouslySetInnerHTML={{ __html: getHTMLFormattedText(option) }}></span>
                                <span className="text-sm percentage-attempted ml-auto"></span>
                            </div>
                        ))}
                    </div>
                    {is_show_tags && (
                        <div className={`block tags items-center whitespace-nowrap py-2 w-full border-t-2 mt-4`}>
                            {que.tags.map((tag, index) => {
                                if (["mock", "mcqs", "practice", "random", "random-mcq"].includes(tag)) return;
                                return (
                                    <span
                                        key={index}
                                        className="mx-1 text-[0.9em]  border border-blue-500 rounded-md  text-blue-500 px-2 py-1 text-sm cursor-pointer"
                                        onClick={(event) => {
                                            let popup_ele = getPopupElement();
                                            ReactDOM.render(<ConfirmFilterMCQsByTags tag={tag} />, popup_ele);
                                        }}
                                    >
                                        {convertIntoHashTag(tag)}
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {is_show_icons && (
                        <div className="full-icons-div icons block whitespace-nowrap  h-full w-full items-center justify-center pt-2">
                            {is_testing && (
                                <div
                                    className="inline-block h-full w-fit mx-1 pressing-effect"
                                    onClick={(event) => {
                                        // twitter sharable question text
                                        let mcq_url = getMCQURL(que.id);
                                        let text = "Q: " + que.question + "\n\n";
                                        que.options.forEach((option, index) => {
                                            text += `${index + 1}. ${option} \n`;
                                        });
                                        text += "\nAnswer 👉 " + mcq_url + "\n\n";
                                        text += `#${exam}_exam`;
                                        que.tags.forEach((tag) => {
                                            if (text.length > 250) return;
                                            text += ` #${tag.replaceAll(" ", "_")}`;
                                        });
                                        navigator.clipboard.writeText(text);
                                        popupAlert("Question text copied to clipboard", 3, "green");
                                    }}
                                >
                                    <div className="flex justify-center items-center gap-2 border rounded-md px-2 text-gray-500 cursor-pointer">
                                        <i className="bi bi-copy"></i>
                                        <span className="text-sm">Copy</span>
                                    </div>
                                </div>
                            )}
                            <div className="explanation hide inline-block h-full w-fit mx-1 pressing-effect" onClick={(event) => showMCQExplanation(que, event)}>
                                <div className="flex justify-center items-center gap-2 border rounded-md px-2 text-gray-500 cursor-pointer">
                                    <i className="bi bi-file-text"></i>
                                    <span className="text-sm">Explanation</span>
                                </div>
                            </div>
                            <div className="linked-note hide linked-block inline-block h-full w-fit mx-1 pressing-effect" onClick={(event) => openChapterNoteByLinkedBlockUid(que.linked_block_uid)}>
                                <div className="flex justify-center items-center gap-2 border rounded-md px-2 text-gray-500 cursor-pointer">
                                    <i className="bi bi-bullseye"></i>
                                    <span className="text-sm">Linked Note</span>
                                </div>
                            </div>
                            <div className="video hide inline-block h-full w-fit mx-1 pressing-effect" onClick={(event) => showMCQExplanation(que, event)}>
                                <div className="flex justify-center items-center gap-2 border rounded-md px-2 text-gray-500 cursor-pointer">
                                    <i className="bi bi-youtube"></i>
                                    <span className="text-sm">Video</span>
                                </div>
                            </div>
                            <div className="external-link hide inline-block h-full w-fit mx-1 pressing-effect" onClick={(event) => showMCQExplanation(que, event)}>
                                <div className="flex justify-center items-center gap-2 border rounded-md px-2 text-gray-500 cursor-pointer">
                                    <i className="bi bi-box-arrow-up-right"></i>
                                    <span className="text-sm">Link</span>
                                </div>
                            </div>
                            {type != "bookmarked-mcq" && (
                                <div
                                    className="bookmark inline-block h-full w-fit mx-1 pressing-effect"
                                    onClick={(event) => {
                                        userdata.bookmarked_questions = userdata.bookmarked_questions ? userdata.bookmarked_questions : [];
                                        if (!userdata.bookmarked_questions.includes(que.id)) userdata.bookmarked_questions.unshift(que.id);
                                        saveUserData();
                                        popupAlert("Added to saved MCQs", 3, "green");
                                    }}
                                >
                                    <div className="flex justify-center items-center gap-2 border rounded-md px-2 text-gray-500 cursor-pointer">
                                        <i className="bi bi-bookmark"></i>
                                        <span className="text-sm">Save</span>
                                    </div>
                                </div>
                            )}
                            {type === "bookmarked-mcq" && (
                                <div
                                    className="bookmark inline-block h-full w-fit mx-1 pressing-effect"
                                    onClick={(event) => {
                                        let index = userdata.bookmarked_questions.findIndex((q) => q == que.id);
                                        if (index != -1) {
                                            userdata.bookmarked_questions.splice(index, 1); // Remove one item at the found index
                                            event.target.closest(".bookmarked-mcq-div").remove();
                                            popupAlert("Removed from saved MCQs", 3, "red");
                                            saveUserData();
                                        }
                                    }}
                                >
                                    <div className="flex justify-center items-center gap-2 border rounded-md px-2 text-gray-500 cursor-pointer">
                                        <i className="bi bi-bookmark-fill bookmarked"></i>
                                        <span className="text-sm">Unsave</span>
                                    </div>
                                </div>
                            )}
                            <div className="share inline-block h-full w-fit mx-1 pressing-effect" onClick={(event) => copyAndShareMCQURL(que.id, event)}>
                                <div className="flex justify-center items-center gap-2 border rounded-md px-2 text-gray-500 cursor-pointer">
                                    <i className="bi bi-share"></i>
                                    <span className="text-sm">Share</span>
                                </div>
                            </div>
                            <div className="report inline-block h-full w-fit mx-1 pressing-effect" onClick={(event) => openReportMCQSection(que.id, event)}>
                                <div className="flex justify-center items-center gap-2 border rounded-md px-2 text-gray-500 cursor-pointer">
                                    <i className="bi bi-flag"></i>
                                    <span className="text-sm">Report</span>
                                </div>
                            </div>

                            {type != "fullscreen" && is_testing && (
                                <div className="fullscreen inline-block h-full w-fit mx-1 pressing-effect" onClick={(event) => openMCQInFullScreen(que)}>
                                    <div className="flex justify-center items-center gap-2 border rounded-md px-2 text-gray-500 cursor-pointer">
                                        <i className="bi bi-fullscreen"></i>
                                        <span className="text-sm">Fullscreen</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    } catch (error) {
        console.log(`esa: error in GetMCQHTML: ${error}`);
        return <div className="mcq-error-div block"></div>;
    }
}

function openMCQInFullScreen(que) {
    try {
        que = que.id ? que : getQuestionById(que);
    } catch (error) {
        console.log(`esa: error in openMCQInFullScreen: ${error}`);
        return;
    }
    if (!que) return;
    let div = document.createElement("div");
    div.className = "mcq-fullscreen-overlay me-overlay bg-white";
    let overlays_div = document.querySelector(".me-overlays");
    if (!overlays_div) {
        overlays_div = document.createElement("div");
        overlays_div.className = "me-overlays";
        document.body.appendChild(overlays_div);
    }
    overlays_div.appendChild(div);
    ReactDOM.render(<LoadMCQFullScreenHtml que={que} />, div);
    removePopupAlert();
}

function LoadMCQFullScreenHtml({ que }) {
    let url = window.location.href;
    window.location.href = url + `/${que.id}`;
    /*let interval = setInterval(() => {
        let ele = document.querySelector(".mcq-fullscreen-inner");
        if (ele) {
            clearInterval(interval);
            let element = document.querySelector(".mcq-fullscreen-overlay");
            let touchStartY = 0;
            let touchEndY = 0;

            element.addEventListener("touchstart", (event) => {
                touchStartY = event.touches[0].clientY;
            });

            element.addEventListener("touchend", (event) => {
                touchEndY = event.changedTouches[0].clientY;
                let index = filtered_mcqs.findIndex((q) => q.id == que.id);
                if (touchStartY - touchEndY > 50) {
                    
                    index++;
                    if (index < filtered_mcqs.length) {
                        let next_que = filtered_mcqs[index];
                        let url = window.location.href;
                        window.location.href = url.substring(0, url.lastIndexOf("/"));
                        openMCQInFullScreen(next_que);
                    }
                } else if (touchEndY - touchStartY > 50) {
                    index--;
                    if (index >= 0) {
                        let next_que = filtered_mcqs[index];
                        let url = window.location.href;
                        window.location.href = url.substring(0, url.lastIndexOf("/"));
                        openMCQInFullScreen(next_que);
                    }
                }
            });
        }
    }, 100);*/
    return (
        <div className="mcq-fullscreen-inner w-full h-full">
            <div className="flex justify-start items-center gap-2 py-3 px-2">
                <i
                    className="bi bi-arrow-left-circle text-xl cursor-pointer px-4 py-3"
                    onClick={(event) => {
                        let url = window.location.href;
                        window.location.href = url.substring(0, url.lastIndexOf("/"));
                        event.target.closest(".me-overlay").remove();
                    }}
                ></i>
                <span className="text-xl font-bold text-gray-700">MCQ</span>
            </div>

            {GetMCQHTML({ que: que, index: 0, type: "fullscreen", is_show_icons: true, is_show_tags: true })}
        </div>
    );
}

function filterMcqsByTag(tag, event) {
    tag = tag ? tag.toLowerCase() : event.target.textContent.trim().toLowerCase();
    filtered_mcqs = que_data.filter((que) => que.tags.includes(tag));
    if (tag == "all") filtered_mcqs = que_data.slice(0, 50);
    sortArrayRandomly(filtered_mcqs);
    //userdata.filtered_mcqs = filtered_mcqs;
    saveUserData();
    if (filtered_mcqs.length == 0) {
        popupAlert(`No MCQs found for this tag(s): ${tag}`, 3, "red");
        return;
    }
    openTab("mcq");
    openSubPage("mcq", "all-mcqs");
    displayFilteredMCQs();
}

async function getMCQCommentsObject(que) {
    let data_ref = database.ref(`esa_data/${exam}/mcq_data/${que.id}/comments`);
    let data = await getDataFromFirebaseUsingRef(data_ref);
    data = data ? data : [];
    return data;
}

function getTodayDate() {
    // in the YYYY-MM-DD format
    var today = new Date();
    var year = today.getFullYear();
    var month = String(today.getMonth() + 1).padStart(2, "0"); // Months are zero-based
    var day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function convertIntoHashTag(tag) {
    return tag;
    tag = "#" + tag;
    tag = tag.replaceAll(" ", "_");
    return tag;
}

function getUniqueId() {
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var id = "";
    for (var i = 0; i < 15; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}
function getTodayDateAndTime() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are zero-indexed
    const day = String(now.getDate()).padStart(2, "0");

    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}:${seconds}`,
    };
}

function addMcqToDailyPractisedQuestions(que_obj) {
    userdata.daily_practise_questions = userdata.daily_practise_questions ? userdata.daily_practise_questions : [];
    if (!userdata.daily_practise_questions.length || userdata.daily_practise_questions[0].date != getTodayDate()) {
        let obj = {
            date: getTodayDate(),
            questions: [],
        };
        userdata.daily_practise_questions.unshift(obj);
    }

    userdata.daily_practise_questions[0].questions.push(que_obj);
    console.log(`esa: question added to today practised questions`, userdata.daily_practise_questions);
    saveUserData();
    //loadTodayPractisedMCQsCount();
}
function loadDailyPractiseQuestions() {
    return;
    userdata.daily_practise_questions = userdata.daily_practise_questions ? userdata.daily_practise_questions : [];
    if (userdata.daily_practise_questions.length) {
        if (userdata.daily_practise_questions[0].date == getTodayDate()) {
            let target = document.querySelector(".today-practised-questions");
            let today_questions = userdata.daily_practise_questions[0].questions;
            ReactDOM.render(<DailyPractisedQuestionsHTML today_questions={today_questions} />, target);
        }

        setTimeout(() => {
            const questionsList = document.querySelector(".today-practised-questions .questions-list");
            const lastQuestion = questionsList ? questionsList.lastElementChild : null;

            if (lastQuestion) {
                //lastQuestion.scrollIntoView({ behavior: "smooth", inline: "start" });
            }
        }, 1000);
    } else {
        return;
    }
}
function DailyPractisedQuestionsHTML({ today_questions }) {
    return <div></div>;
}

function getQuestionById(id) {
    return que_data.find((q) => q.id == id);
}

function getHTMLFormattedText(text, search_text) {
    if (!text) text = "";
    text = text.replaceAll("nn_ll", "\n");

    // Replace [[ and ]] with an empty string
    text = text.replace(/\[\[|\]\]/g, "");
    if (search_text) {
        text = text.replace(new RegExp(search_text, "gi"), (match) => `<span class="bg-yellow-200">${match}</span>`);
    }

    // Replace [ --- ] with a divider line
    text = text.replace(/\[ *-+ *\]/g, '<span class="block my-5 border-t border-gray-500 divider-line"></span>');

    // replace :_: with :: , for reasoning base question for SSC
    text = text.replace(/:_:/g, " :: ");

    // Convert **hello** to bold <span>
    text = text.replace(/\*\*(.*?)\*\*/g, '<span class="me-bold">$1</span>');
    // __Mansur__ to <span class="font-ilatic">Mansur</span>
    //text = text.replace(/\__(.*?)\__/g, '<span class="me-ilatic">$1</span>');
    // Convert ^^hello^^ to highlight <span>
    text = text.replace(/\^\^(.*?)\^\^/g, '<span class="me-highlight">$1</span>');

    // Convert ![text](src_link) to <img>
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<span class="show-image hide">Show images</span> <img className="me-image" src="$2" alt="$1">');

    // Convert [text](link) to <a>
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="link" target="_blank">$1</a>');

    // Convert {video:ASDASDDE:399} to <i className="fa-brands fa-youtube video" id="video-id" time="399"></i> fa-duotone fa-solid fa-play
    //text = text.replace(/\{video:([^:]+):(\d+)\}/g, '<i className="fa-brands fa-youtube video" id="$1" time="$2"></i>');
    //text = text.replace(/\{video:([^:]+):(\d+)\}/g, '<i class="bi bi-play-btn video cursor-pointer " id="$1" time="$2"></i>');
    text = text.replace(/\{ video: ([^:]+) : (\d+) \}/g, '<i class="bi bi-youtube text-red-500 video cursor-pointer" video-id="$1" time="$2"></i>');

    // Convert \n to <br>
    text = text.replaceAll("me_new_line", "<div class='w-full'></div>");
    text = text.replace(/\n/g, "<br>");

    text = text.replace(/(\d+)_fraction_(\d+)/g, (match, a, b) => convertFractions(a, b));
    text = text.replace(/(\d+)_power_(\d+)/g, (match, a, b) => convertPower(a, b));
    return text;
}

function openSubPage(page, sub_page) {
    let main_page = document.querySelector(`.main-content .pages .page.${page}`); //event.target.closest(".page");
    let sub_pages = main_page.querySelectorAll(`.sub-page`);
    sub_pages.forEach((sub_page) => {
        sub_page.classList.add("hide");
    });
    let ele = main_page.querySelector(`.sub-page.${sub_page}`);
    if (ele) ele.classList.remove("hide");
    setURL(page, sub_page);
}
function openTab(tab) {
    const activePage = document.querySelector(".main-content .pages > .page:not(.hide)");
    if (activePage) {
        activePage.classList.add("hide");
    }
    document.querySelector(`.pages > .page.${tab}`).classList.remove("hide");
    setURL(tab);
}
function setURL(page = "", sub_page = "") {
    let url = window.location.href;
    url = new URL(url).origin;
    url = url + `/#/${exam}/${page}`;
    if (sub_page) url = url + `/${sub_page}`;
    window.location.href = url;
}

function setExam() {
    let exams = ["ssc", "upsc", "neet"];
    // First check if the exam is already set in local storage
    let exam_from_local_storage = localStorage.getItem("esa_exam_name");
    if (exam_from_local_storage) {
        exam = exam_from_local_storage.toLowerCase();
    }
    // Then check if the exam from the url
    let url = window.location.href;
    for (let i = 0; i < exams.length; i++) {
        if (url.includes(exams[i])) {
            exam = exams[i].toLowerCase();
            localStorage.setItem("esa_exam_name", exam);
            return;
        }
    }
    exam = exam ? exam.toLowerCase() : "";
}

// Data related variables
var userdata = {};
var user_login_data = {};
var app_data = {
    mcq_data: {},
    notes_data: {},
    mocks_data: {},
    all_users_login_info: [],
};

var all_users_login_info = [];
var que_data = [];
var shared_mcqs = [];
var user_mcqs = [];
var empty_question_mcqs = [];
var filtered_mcqs = [];

var notes_data = [];
var notes_chapters_list = [];
var tags_list = [];
var static_mocks = [];

async function loadData() {
    userdata = localStorage.getItem(`esa_${exam}_userdata`);
    userdata = userdata ? JSON.parse(userdata) : {};
    console.log(`Userdata loaded from local storage`, userdata);

    app_data = localStorage.getItem(`esa_${exam}_app_data`);
    app_data = app_data ? JSON.parse(app_data) : {};
    console.log(`App data loaded from local storage`, app_data);

    temp_app_data = app_data;
    temp_userdata = userdata;
    if (app_data && app_data.mcqs) {
        return;
    } else {
        await getUpdatedAppDataFromFirebase();

        loadMCQsPage();
        if (load_url.indexOf("/mcq/") != -1) {
            let id = load_url.substring(load_url.lastIndexOf("/") + 1);
            if (id !== "") {
                openMCQInFullScreen(getQuestionById(id));
            }
        }
    }
}

async function getUpdatedAppDataFromFirebase() {
    let is_online = navigator.onLine;
    if (!is_online) {
        popupAlert("You are offline, cannot fetch latest app data", 5, "red");
        return;
    }

    let [mcqs, mcq_tags_list, static_mocks, linked_blocks_text, notes_pages] = await Promise.all([getMCQsData(), getMCQTagsList(), getStaticMocks(), getLinkedBlocksTextData(), getNotesPagesData()]);

    app_data = {
        mcqs: mcqs ? mcqs : [],
        mcq_tags_list: mcq_tags_list ? mcq_tags_list : [],
        static_mocks: static_mocks ? static_mocks : [],
        linked_blocks_text: linked_blocks_text ? linked_blocks_text : [],
        notes_pages: notes_pages ? notes_pages : [],
    };
    localStorage.setItem(`esa_${exam}_app_data`, JSON.stringify(app_data));
    console.log(`esa: fresh app_data is loaded into local storage `);
    que_data = app_data.mcqs ? app_data.mcqs : [];
    //distributeData();
}

function distributeData() {
    que_data = app_data.mcqs ? app_data.mcqs : [];
    tags_list = app_data.mcq_tags_list ? app_data.mcq_tags_list : [];
    static_mocks = app_data.static_mocks ? app_data.static_mocks : [];
    //que_data = que_data.filter((q) => q.question.trim() != "");
}

async function getMCQsData() {
    let ref = database.ref(`${base_data_ref}/mcqs`);
    let data = await getDataFromFirebaseUsingRef(ref);
    data = data ? data : [];

    return data;
}

async function getMCQTagsList() {
    let ref = database.ref(`${base_data_ref}/mcq_tags_list`);
    let data = await getDataFromFirebaseUsingRef(ref);
    data = data ? data : [];

    return data;
}

async function getStaticMocks() {
    let ref = database.ref(`${base_data_ref}/static_mocks`);
    let data = await getDataFromFirebaseUsingRef(ref);
    data = data ? data : [];
    return data;
}

async function getLinkedBlocksTextData() {
    let ref = database.ref(`${base_data_ref}/linked_blocks_text`);
    let data = await getDataFromFirebaseUsingRef(ref);
    data = data ? data : [];
    return data;
}

async function getNotesPagesData() {
    let ref = database.ref(`${base_data_ref}/notes_pages`);
    let data = await getDataFromFirebaseUsingRef(ref);
    data = data ? data : [];
    return data;
}

async function saveUserData() {
    localStorage.setItem(`esa_${exam}_userdata`, JSON.stringify(userdata));
    console.log(`Userdata saved to local storage`);
}

async function getDataFromFirebaseUsingRef(ref) {
    let snapshot = await ref.once("value");
    let obj = snapshot.val();
    return obj;
}

function copyAndShareMCQURL(id, event) {
    //note: keep the event here as the clipboard write works only if the event is passed. Without event the navigator.. will not work.

    let url = getMCQURL(id);
    //copyTextToClipboard(url); // Fallback to copy URL to clipboard
    navigator.clipboard.writeText(url);
    popupAlert("MCQ link copied to clipboard");
    if (navigator.share) {
        navigator
            .share({
                title: "Share MCQ Link",
                url: url,
            })
            .then(() => {})
            .catch((error) => {
                console.error("Error sharing link:", error);
            });
    }
}
function getMCQURL(id) {
    let url = window.location.href;
    url = new URL(url).origin;
    url = url + `/#/${exam}/mcq/${id}`;
    return url;
}
function openReportMCQSection(id, event) {
    let ele = event.target.closest(".mcq-item").querySelector(".report-mcq-section");
    if (ele) return;

    let div = document.createElement("div");
    div.className = "report-mcq-section block";
    event.target.closest(".mcq-item").appendChild(div);
    ReactDOM.render(<ReportMCQSection id={id} />, div);
}
function ReportMCQSection({ id }) {
    return (
        <div className="report-mcq-section-inner block border-t-2 mt-2">
            <div className="flex flex-col justify-start items-start gap-2">
                <span className="font-bold text-gray-500 py-1">Report MCQ:</span>
                <textarea className="w-full h-[80px] border-2 px-3 py-2  rounded-md" placeholder="Please describe the issue with this MCQ"></textarea>
                <div className="flex justify-end items-start gap-2 pr-7 w-full">
                    <button className=" px-2 py-1 text-blue-500 cursor-pointer" onClick={(event) => event.target.closest(".report-mcq-section").remove()}>
                        Cancel
                    </button>
                    <button className="border border-blue-500 rounded-md px-2 py-1 text-blue-500 cursor-pointer" onClick={(event) => submitMCQReport(id, event)}>
                        Submit
                    </button>
                </div>
            </div>
        </div>
    );
}
async function submitMCQReport(id, event) {
    let message = event.target.closest(".report-mcq-section").querySelector("textarea").value;
    if (message == "") {
        popupAlert("Please describe the issue with this MCQ", 3, "red");
        return;
    }
    let obj = {
        userid: user_login_data.userid,
        create_date: getTodayDate(),
        que_id: id,
        message: message,
    };
    let ref = database.ref(`esa_data/${exam}/reported_mcqs`);
    let data = await getDataFromFirebaseUsingRef(ref);
    data = data ? data : [];
    data.push(obj);
    await ref.set(data);
    event.target.closest(".report-mcq-section").remove();
    popupAlert("Your report has been submited; Thanks for reporting :-)");
}
function bookmarkMcq(que, event) {
    let is_bookmarked = event.target.classList.contains("bookmarked");
    if (is_bookmarked) {
        event.target.classList.remove("bookmarked", "bi-bookmark-fill");
        removeItemFromArray(userdata.bookmarked_questions, que.id);
        event.target.classList.add("bi-bookmark");
        popupAlert("Removed from bookmarked questions");
    } else {
        event.target.classList.remove("bi-bookmark");
        event.target.classList.add("bookmarked", "bi-bookmark-fill");
        userdata.bookmarked_questions.unshift(que.id);
        popupAlert("Added to bookmarked questions");
    }
    saveUserData();
}
function popupAlert(message, time_in_sec, color) {
    let ele = document.querySelector(".me-popup-alert-top");
    if (ele) {
        ele.remove();
    }

    var div = document.createElement("div");
    document.body.append(div);
    div.className = `me-popup-alert-top w-full fixed top-5 left-0 right-0 flex justify-center z-11001`;
    // z-index is 11001 because the me-overlay has z-index 11000.
    ReactDOM.render(<PopupAlertHTMLMessage message={message} color={color} time_in_sec={time_in_sec} />, div);

    if (time_in_sec) {
        setTimeout(function () {
            div.remove();
        }, `${time_in_sec * 1000}`);
    } else {
        setTimeout(function () {
            div.remove();
        }, 3000);
    }
}

function removePopupAlert() {
    let ele = document.querySelector(".me-popup-alert-top");
    if (ele) ele.remove();
}

function PopupAlertHTMLMessage({ message, color, time_in_sec }) {
    let arr = message.split(";");
    return (
        <div className={`me-popup-alert ${color ? `bg-${color}-800` : "bg-blue-800"} px-3 py-2 rounded text-white w-[90%]  z-10000`}>
            <div className="flex justify-start items-baseline gap-2">
                <div className="message flex-1 flex flex-col gap-1 justify-start items-start">
                    {arr.map((msg, index) => (
                        <div className="text-sm" key={index}>
                            {msg}
                        </div>
                    ))}
                </div>
                <i
                    className="bi bi-x-circle text-xl cursor-pointer"
                    onClick={(event) => {
                        event.target.closest(".me-popup-alert").remove();
                    }}
                ></i>
            </div>
        </div>
    );
}

function removeItemFromArray(array, item) {
    const index = array.indexOf(item);
    if (index > -1) {
        array.splice(index, 1);
    }
    return array;
}
function copyTextToClipboard(text) {
    navigator.clipboard.writeText(text);
    console.log(`esa: copied to clipboard: ${text}`);
    return;
}

function capitalFirstLetterOfEachWord(str) {
    return str.toLowerCase().replace(/(?:^|\s)\S/g, function (a) {
        return a.toUpperCase();
    });
}

function blastCrackers(x, y) {
    const canvas = document.getElementById("crackerCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ["#FF5733", "#FFC300", "#DAF7A6", "#FF33FF", "#33FF57"];

    const createParticles = (x, y) => {
        for (let i = 0; i < 50; i++) {
            particles.push({
                x: x,
                y: y,
                size: Math.random() * 5 + 1,
                speedX: (Math.random() - 0.5) * 6,
                speedY: (Math.random() - 0.5) * 6,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: Math.random() * 30 + 10,
            });
        }
    };

    createParticles(x, y);

    const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach((particle, index) => {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = particle.color;
            ctx.fill();

            particle.x += particle.speedX;
            particle.y += particle.speedY;
            particle.size *= 0.95;
            particle.life -= 1;

            if (particle.life <= 0) particles.splice(index, 1);
        });

        if (particles.length > 0) requestAnimationFrame(animate);
    };

    animate();
}

var me_video_player = null;
function playVideoPlayer(video_id, time, event) {
    let div = event.target.closest(".mcq-explanation-div-inner").querySelector(".me-iframe-div-inner");
    if (div) {
        div.remove();
        me_video_player = null;
    }

    div = event.target.closest(".mcq-explanation-div-inner").querySelector(".me-iframe-div");
    if (!div) {
        popupAlert("Iframe element not found");
        return;
    }

    let url_obj = new URL(window.location.href);
    let url_origin = url_obj.origin;

    div.innerHTML = `
    <div class="me-iframe-div-inner h-full w-full flex flex-col justify-center items-center">
        <div class="header flex justify-end items-center w-[100%]">
            <i class="bi bi-x-circle text-xl cursor-pointer cross mr-3"></i>
        </div>
        <div class="me-iframe">
            <iframe id="${video_id}" class="rm-iframe rm-video-player w-[100%] h-[200px]" frameborder="0" allowfullscreen="" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" title="THE LIVING WORLD in 1 Shot: FULL CHAPTER COVERAGE (Theory+PYQs) ||  Prachand NEET 2024" width="640" height="360" src="https://www.youtube.com/embed/${video_id}?enablejsapi=1&amp;origin=${url_origin}&amp;widgetid=5"></iframe>
        </div>
    </div>
    `;

    div.querySelector(".cross").addEventListener("click", (event) => {
        div.innerHTML = "";
    });
    let iframe = div.querySelector("iframe");
    initializeYouTubePlayer(time, video_id, iframe);
}
function initializeYouTubePlayer(time, video_id, iframe) {
    me_video_player = new YT.Player(iframe.id, {
        videoId: video_id, // Set the video ID here
        events: {
            onReady: function (event) {
                // Seek to the specified time and play the video
                event.target.seekTo(time);
                event.target.playVideo();
            },
        },
        playerVars: {
            autoplay: 1,
            start: time,
        },
    });
}

function loadMocksPage() {
    let div = document.querySelector(".main-content .pages .page.mocks");
    if (div) emptyReactContainer(div);
    ReactDOM.render(<LoadMocksPageHTML />, div);

    let interval = setInterval(() => {
        let ele = document.querySelector(".main-content .pages .page.mocks .sub-pages .sub-page.new-mock");
        if (ele) {
            loadNewMockPage();
            clearInterval(interval);
        }
    }, 100);
}

function LoadMocksPageHTML() {
    let sub_pages = ["new-mock", "static-mocks", "mock-history"];
    let interval_id = setInterval(() => {
        let ele = document.querySelector(".main-content .pages .page.mocks .sub-pages .sub-page.new-mock");
        if (ele) {
            clearInterval(interval_id);
            loadNewMockPage();
        }
    }, 100);
    return (
        <div className="h-full w-full block">
            <div className="h-[50px] w-full bg-gray-100 top-bar fixed top-0 left-0 border-b-2 border-gray-200">
                <div className="mcq flex justify-between items-center px-3 h-full w-full">
                    <span
                        className="title text-xl font-semibold cursor-pointer"
                        onClick={(event) => {
                            openSubPage("mocks", "new-mock", event);
                        }}
                    >
                        Mocks
                    </span>
                    <div className="icons flex justify-end items-center gap-4">
                        <i
                            className="hide bi bi-plus-square text-xl cursor-pointer   "
                            onClick={(event) => {
                                openSubPage("mocks", "new-mock", event);
                            }}
                        ></i>
                        <i
                            className="hide bi bi-list text-xl cursor-pointer"
                            onClick={(event) => {
                                loadStaticMocks();
                                openSubPage("mocks", "static-mocks", event);
                            }}
                        ></i>
                        <i
                            className="hide bi bi-clock-history text-xl cursor-pointer"
                            onClick={(event) => {
                                loadMockHistory();
                                openSubPage("mocks", "mock-history", event);
                            }}
                        ></i>
                    </div>
                </div>
            </div>
            <div className="sub-pages h-full w-full">
                {sub_pages.map((sub_page_name, index) => {
                    return (
                        <div key={sub_page_name} className={`sub-page ${sub_page_name} h-full w-full max-h-[calc(100vh-120px)] overflow-y-scroll ${index == 0 ? "" : "hide"}`}>
                            {sub_page_name}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function loadStaticMocks() {
    let div = document.querySelector(".main-content .pages .page.mocks .sub-pages .sub-page.static-mocks input");
    if (div) return;

    div = document.querySelector(".main-content .pages .page.mocks .sub-pages .sub-page.static-mocks");
    ReactDOM.render(<StaticMocksHTML />, div);
}
function StaticMocksHTML() {
    return (
        <div className="block h-full w-full static-mocks-inner">
            <div className="block h-[85px] w-full">
                <div className="flex flex-col justify-center items-center gap-2 w-full py-2 px-4">
                    <span className="text-xl font-semibold">Static Mock Tests</span>
                    <div className="flex justify-center items-center w-full border rounded-full px-4 py-1">
                        <i className="bi bi-search text-gray-500"></i>
                        <input
                            type="text"
                            className="w-full px-4 border-none outline-none"
                            placeholder="Search mocks tests"
                            onKeyUp={(event) => {
                                let value = event.target.value;
                                //let filtered_mocks = static_mocks.filter((mock) => mock.name.toLowerCase().includes(value.toLowerCase()));
                                let filtered_mocks = static_mocks.filter((mock) => {
                                    const queryWords = value.toLowerCase().split(" "); // Split input by spaces
                                    const mockName = mock.name.toLowerCase();

                                    // Check if all words in the query exist in the mock name, in order
                                    return queryWords.every((word) => mockName.includes(word));
                                });

                                let target = document.querySelector(".page.mocks .sub-page.static-mocks .static-mocks-list");
                                target.innerHTML = "";
                                filtered_mocks.forEach((mock) => {
                                    let div = document.createElement("div");
                                    div.className = "static-mock-test-item block h-auto w-full mx-2 my-4";
                                    target.appendChild(div);
                                    ReactDOM.render(<StaticMockTestItemHTML mock={mock} />, div);
                                });
                            }}
                        />
                    </div>
                </div>
            </div>
            <div className="block h-full max-h-[calc(100vh-200px)] w-full static-mocks-list">
                {static_mocks.map((mock) => (
                    <div key={mock.id} className="static-mock-test-item block h-auto w-full mx-2 my-4">
                        <StaticMockTestItemHTML mock={mock} />
                    </div>
                ))}
            </div>
        </div>
    );
}
function StaticMockTestItemHTML({ mock }) {
    let sub_wise_ques = [];
    subjects[exam].forEach((subject) => {
        let sub_que_ids = mock.que_ids.filter((id) => que_data.find((que) => que.id == id && que.tags.includes(subject)));
        sub_wise_ques.push(sub_que_ids.length);
    });

    let color = ["bg-red-100", "bg-green-100", "bg-blue-100", "bg-yellow-100", "bg-purple-100"];
    return (
        <div className="static-mock-item-inner block h-full w-full px-4 py-2">
            <div className="flex flex-col justify-start items-start gap-1 border border-gray-200 rounded-md p-2">
                <span className="text-md font-bold text-gray-600 mock-name">{mock.name}</span>
                <span className=" text-gray-500 py-1 hide">Try "subject wise" or "full" mock test</span>
                <div className=" block subject-div max-w-full overflow-x-auto py-2">
                    <div className="flex space-x-4 ">
                        {subjects[exam].map((subject, index) => (
                            <span
                                className={`subject text-sm  inline-flex min-w-[fit-content] items-center whitespace-nowrap border border-gray-300 rounded-md py-1 px-2 text-no-wrap cursor-pointer ${color[index]} ${sub_wise_ques[index] ? "" : "disabled"}`}
                                key={index}
                                onClick={() => {
                                    let que_ids = mock.que_ids.filter((id) => que_data.find((que) => que.id == id && que.tags.includes(subject)));

                                    let obj = {
                                        id: mock.id,
                                        name: mock.name,
                                        que_ids: que_ids,
                                    };
                                    startNewMockTest(obj);
                                }}
                            >
                                {capitalFirstLetterOfEachWord(subject) + " (" + sub_wise_ques[index] + ")"}
                            </span>
                        ))}
                    </div>
                </div>

                <span
                    className="full-mock text-blue-500 text-sm border bg-gray-100  border-gray-300 rounded-md p-1 px-2 text-center cursor-pointer"
                    onClick={() => {
                        startNewMockTest(mock);
                    }}
                >
                    Full Mock ({mock.que_ids.length})
                </span>
                {mock.pdf && mock.pdf != "" && (
                    <div className="text-md cursor-pointer flex justify-start items-center gap-2 py-1 px-4 border border-gray-500 text-gray-500  rounded-md w-[fit-content] h-[30px]" onClick={() => openPdfFile(mock.pdf, mock.name)}>
                        <i className="bi bi-filetype-pdf text-sm text-red-500"></i>
                        <span className="text-sm"> Open PDF</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function loadNewMockPage() {
    let div = document.querySelector(".main-content .pages .page.mocks .sub-pages .sub-page.new-mock input");
    if (div) return;
    div = document.querySelector(".main-content .pages .page.mocks .sub-pages .sub-page.new-mock");
    ReactDOM.render(<NewMockPageHTML />, div);
}
function NewMockPageHTML() {
    let interval_id = setInterval(() => {
        let input_ele = document.querySelector(".main-content .pages .page.mocks .sub-pages .sub-page.new-mock input.total-questions-for-mock");
        if (input_ele) {
            clearInterval(interval_id);
            input_ele.value = 50;
            let ele = document.querySelector(".main-content .page.mocks .sub-pages .sub-page.new-mock .tab-section .subject-wise.tab-container");
            if (ele) {
                ele.innerHTML = "";
                loadSubjectWiseTagsForFilterMCQs(ele);
            }
        }
    }, 100);

    return (
        <div className="block h-full w-full max-h-[calc(100vh-120px)] overflow-y-scroll">
            <div className="block h-full w-full">
                <div className="flex justify-start items-center gap-2 px-4 py-2">
                    <button className="text-sm font-bold border text-white bg-blue-500 rounded-md w-full py-3 px-4 inline-block cursor-pointer my-2" onClick={() => startNewMockTest(null)}>
                        Start New Mock
                    </button>
                    <span className="hide text-xs text-gray-500">This will start a new mock test in the app.</span>
                </div>
            </div>

            <div className="block subject-div h-full w-full overflow-x-auto py-2 px-4 mt-5">
                <span className="h-full w-full text-md font-semibold">Give mock test for subject(s):</span>
                <div className="flex space-x-4 py-2 ">
                    {subjects[exam].map((subject, index) => (
                        <span
                            key={index} // Add a key for each child in the list
                            className=" subject inline-flex items-center whitespace-nowrap border text-gray-500 h-full rounded-md px-2 py-1 min-w-[fit-content] cursor-pointer"
                            onClick={(event) => {
                                //selectSubjectForMock(subject, event)
                                event.target.closest(".subject").classList.toggle("active");
                                document.querySelector(".mocks.page .selected-tags-list").innerHTML = "";
                            }}
                        >
                            {capitalFirstLetterOfEachWord(subject)}
                        </span>
                    ))}
                </div>
                <div className="flex justify-start items-start gap-2 mr-auto">
                    <i className="bi bi-info-circle w-[20px] text-sm text-gray-400"></i>
                    <span className="text-sm text-gray-400 flex-1">You can select one or more subjects. If no subject is selected you will have full mock test. Each subject will have 25 questions</span>
                </div>
            </div>

            <div className="block h-full w-full mt-5 py-2 px-4  border-t">
                <div className="block h-full w-full">
                    <span className="h-full w-full text-md font-semibold">Give topic(s) wise mock test:</span>
                </div>

                <div className="hide block h-full w-full py-2 px-4 hide">
                    <div className="pyq-based-mock flex justify-start items-center gap-2 w-full">
                        <input type="checkbox" className="check-pyq" />
                        <span className="  text-md  text-gray-500"> Mock based on PYQs </span>
                    </div>
                </div>

                <div className="total-que flex flex-col justify-start items-center  w-full py-4">
                    <div className="flex justify-start items-center gap-2 w-full">
                        <span className="text-md  ">Total questions:</span>
                        <div className="total-questions-for-mock flex space-x-4 py-1 ">
                            {[25, 50, 75, 100].map((total_questions, index) => (
                                <span
                                    key={index} // Add a key for each child in the list
                                    className=" total-questions-for-mock-item inline-flex items-center whitespace-nowrap border text-gray-500 h-full rounded-md px-2 py-1 min-w-[fit-content] cursor-pointer"
                                    onClick={(event) => {
                                        let ele = event.target.closest(".total-questions-for-mock");
                                        if (ele) {
                                            let active_ele = ele.querySelector(".total-questions-for-mock-item.active");
                                            if (active_ele) active_ele.classList.remove("active");
                                        }
                                        event.target.classList.add("active");
                                    }}
                                >
                                    {total_questions}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-start items-start gap-2 mr-auto">
                        <i className="bi bi-info-circle text-sm text-gray-400 w-[30px]"></i>
                        <span className="text-sm text-gray-400">Select maximum number of mcqs for mock test. It will be divided equally among the selected tags. By default it will be 50.</span>
                    </div>
                </div>
            </div>

            <div className="block h-full w-full mt-4 ">
                <div className="block filter-by-tags h-full w-full ">
                    <div className="flex flex-col justify-start items-start w-full  px-3 ">
                        <div className="block h-full w-full selected-tags-section bg-violet-100 px-3 py-2 rounded-md">
                            <div className="flex justify-center items-center gap-2 h-full w-full py-1 my-2">
                                <span className="mr-auto text-gray-700"> Selected Tags:</span>
                                <div className="hide and-or-operation flex justify-center items-center gap-2 mr-4">
                                    <span
                                        className="cursor-pointer active text-sm or"
                                        onClick={(event) => {
                                            switchAndOrOperators("or", event);
                                        }}
                                    >
                                        OR
                                    </span>
                                    <span
                                        className="cursor-pointer  text-sm and"
                                        onClick={(event) => {
                                            switchAndOrOperators("and", event);
                                        }}
                                    >
                                        {" "}
                                        AND
                                    </span>
                                </div>
                            </div>
                            <div className="selected-tags-list flex justify-start items-center flex-wrap gap-2 my-2"></div>
                            <span className="text-sm text-gray-500 filtered-mcq-count h-full w-full py-2"></span>
                            <button className=" hide bg-gray-500 text-white  rounded-md px-2 py-2 cursor-pointer h-full my-2 w-full text-sm" onClick={(event) => filterMcqsBySelectedTags(event)}>
                                filter mcqs by selected tags
                            </button>
                            <div className="hide block share-filtered-mcqs w-full h-full my-4">
                                <div className="flex justify-start items-start gap-2 w-full h-full link cursor-pointer" onClick={(event) => createFilteredMCQsURL(event)}>
                                    <i className="bi bi-share"></i>
                                    <span className="text-sm">Share Filtered MCQs</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center items-center gap-2  h-auto py-2  w-full">
                            <div className="flex justify-center items-center gap-2  w-full rounded-md px-2 py-1 border border-gray-500 ">
                                <i className="bi bi-funnel"></i>
                                <input type="text" className="filter-mcq-input p-1 align-middle focus:outline-none text-sm" placeholder="Search for tags and chapters" onKeyUp={(event) => filterMcqTagItemsByInput(event)} />
                            </div>
                        </div>
                    </div>
                    <div className="block h-full w-full">
                        <div className="flex flex-col justify-center items-center gap-2 h-full w-full">
                            <div className="flex justify-center items-center gap-2 w-full px-4 py-3">
                                <span className="text-gray-500  text-md font-semibold text-no-wrap w-full">Tags and Chapters</span>
                                <div className="icons flex justify-end items-center gap-2 w-full ml-auto mr-[20px] link">
                                    <i className="bi bi-sort-alpha-down text-xl cursor-pointer" onClick={(event) => sortAllTags("az")}></i>
                                    <i className="bi bi-sort-alpha-down-alt text-xl cursor-pointer" onClick={(event) => sortAllTags("za")}></i>
                                    <i className="bi bi-sort-numeric-down text-xl cursor-pointer" onClick={(event) => sortAllTags("19")}></i>
                                    <i className="bi bi-sort-numeric-down-alt text-xl cursor-pointer" onClick={(event) => sortAllTags("91")}></i>
                                </div>
                            </div>
                            <div className="all-tags-list block h-full w-full p-2 ">{LoadAllTagsHTML("new mock page")}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function startNewMockTest(mock_obj) {
    if (!mock_obj) {
        mock_obj = getNewMockTextObject();
    }

    let mock_overlay = document.createElement("div");
    mock_overlay.className = "me-overlay mock-overlay";
    let overlays = document.querySelector(".me-overlays");
    if (!overlays) {
        overlays = document.createElement("div");
        overlays.className = "me-overlays";
        document.body.appendChild(overlays);
    }
    overlays.appendChild(mock_overlay);
    ReactDOM.render(<MockTestOverlayHTML mock_obj={mock_obj} />, mock_overlay);

    setTimeout(() => {
        setTimer(Math.floor(mock_obj.que_ids.length));
    }, 1000);
}

function getNewMockTextObject() {
    let obj = {
        id: getUniqueId(),
        name: "Random Mock Test",
        que_ids: [],
    };

    // Selected Tags mock test.
    // When tag is selected, then we ignore the selected subject
    // Only selected tag mock is run

    let selected_tags = [];
    let selected_tags_eles = document.querySelectorAll(".new-mock .selected-tags-list .tag-name");
    if (selected_tags_eles.length > 0) {
        selected_tags_eles.forEach((ele) => {
            selected_tags.push(ele.textContent.toLowerCase().trim());
        });
    }
    console.log("selected tags", selected_tags);

    let total_questions = document.querySelector(".total-questions-for-mock-item.active");
    if (total_questions) {
        total_questions = parseInt(total_questions.textContent);
    } else {
        total_questions = 50;
    }
    console.log("total questions", total_questions);

    if (selected_tags.length > 0) {
        // create mock object based on the selected tags
        // Calculate the number of questions per tag
        let questions_per_tag = Math.floor(total_questions / selected_tags.length);
        let remaining_questions = total_questions % selected_tags.length; // Handle leftover questions
        let selected_mcqs = [];

        selected_tags.forEach((tag, index) => {
            // Filter questions matching the tag
            let tag_questions = que_data.filter((mcq) => mcq.tags.includes(tag));

            // Sort the filtered mcqs
            tag_questions = sortArrayRandomly(tag_questions);
            tag_questions = sortArrayRandomly(tag_questions);

            // Determine the number of questions to fetch for this tag
            let num_to_fetch = questions_per_tag + (remaining_questions > 0 ? 1 : 0);

            // Add the questions to the selected_mcqs array (up to the required amount)
            selected_mcqs.push(...tag_questions.slice(0, num_to_fetch));

            // Deduct one from remaining_questions if used
            if (remaining_questions > 0) remaining_questions--;

            // Avoid duplicates by using a Set (optional but useful for large datasets)
            selected_mcqs = [...new Set(selected_mcqs)];
        });

        selected_mcqs.forEach((mcq) => {
            obj.que_ids.push(mcq.id);
        });

        return obj;
    }

    //
    // After Tags next preference is given to the subjects
    // Select subject based mock test
    //

    let selected_subjects = [];
    let eles = document.querySelectorAll(".new-mock .subject.active");
    if (eles.length > 0) {
        eles.forEach((subject) => {
            selected_subjects.push(subject.textContent.toLowerCase().trim());
        });
    }
    console.log("selected subjects", selected_subjects);

    if (selected_subjects.length > 0) {
        let arr = [];
        const getQuestionsBySubject = (subject) => {
            const filteredQuestions = que_data.filter((que) => que.tags.includes(subject));
            const shuffledQuestions = sortArrayRandomly(filteredQuestions);
            return shuffledQuestions.slice(0, 25);
        };

        selected_subjects.forEach((subject) => {
            arr = arr.concat(getQuestionsBySubject(subject));
        });

        // Set question IDs in the object
        obj.que_ids = arr.map((que) => que.id);
        return obj;
    }

    //
    // When no tag or subject is selected
    // Run a normal mock test
    //
    if (selected_subjects.length === 0 && selected_tags.length === 0) {
        let arr = [];

        // Helper function to get 15 questions for a specific tag
        const getQuestionsByTag = (tag) => {
            // Filter questions by tag
            const filteredQuestions = que_data.filter((que) => que.tags.includes(tag));
            // Shuffle the filtered questions randomly
            const shuffledQuestions = sortArrayRandomly(filteredQuestions);
            // Take the first 15 questions
            return shuffledQuestions.slice(0, 15);
        };

        // Add 15 questions for each subject
        arr = arr.concat(getQuestionsByTag("general studies"));
        arr = arr.concat(getQuestionsByTag("english"));
        arr = arr.concat(getQuestionsByTag("aptitude"));
        arr = arr.concat(getQuestionsByTag("reasoning"));

        // Randomize the final array (optional)
        //arr = sortArrayRandomly(arr);

        // Set question IDs in the object
        obj.que_ids = arr.map((que) => que.id);
        return obj;
    }
}

function filterMcqTagItemsByInput(event) {
    let input_value = event.target.value.trim().toLowerCase();
    if (input_value != "") {
        //let tags = document.querySelectorAll(".filter-mcqs .all-tags .tag .name");
        let tags = event.target.closest(".sub-page").querySelectorAll(".all-tags-list .tag .name");
        tags.forEach((tag) => {
            if (tag.textContent.toLowerCase().includes(input_value)) {
                tag.parentElement.classList.remove("hide");
            } else {
                tag.parentElement.classList.add("hide");
            }
        });
    }
}

function filterMcqTagItemsForCustomMock(event) {
    let input_value = event.target.value.trim().toLowerCase();
    if (input_value != "") {
        let tag_item_names = document.querySelectorAll(".new-mock .subject-wise .tag-name");
        tag_item_names.forEach((tag_item_name) => {
            if (tag_item_name.textContent.toLowerCase().includes(input_value)) {
                tag_item_name.parentElement.classList.remove("hide");
            } else {
                tag_item_name.parentElement.classList.add("hide");
            }
        });

        let tags = document.querySelectorAll(".new-mock .all-tags .tag");
        tags.forEach((tag) => {
            if (tag.textContent.toLowerCase().includes(input_value)) {
                tag.classList.remove("hide");
            } else {
                tag.classList.add("hide");
            }
        });
    }
}

function MockTestOverlayHTML({ mock_obj }) {
    return (
        <div className="container mock-overlay-inner h-full">
            <div className="sticky top-0 flex justify-start items-center h-[65px] w-full overflow-x-auto p-4 bg-violet-200  gap-2">
                <div className="timer  flex justify-center items-center gap-2 bg-black text-white rounded-md px-2 py-1">
                    <i className="bi bi-clock"></i>
                    <span className="text-sm timer-text">{"19:00"}</span>
                </div>
                <span className="hide correct bg-green-500  text-white  py-1 px-2 rounded-md">+2</span>
                <span className="hide wrong bg-red-500  text-white rounded-md px-2 py-1">0.6</span>
                <div className="share link flex items-center gap-1 border bg-white py-1 px-2 rounded-md cursor-pointer" onClick={(event) => createSharedMockTestUrl(mock_obj)}>
                    <i className="bi bi-share"></i>
                    <span className="">Share</span>
                </div>
                <span className="text-sm bg-blue-700 font-bold  text-white text-no-wrap  rounded-md px-3 py-1 mx-2 ml-auto cursor-pointer" onClick={(event) => submitMockTest(event, mock_obj)}>
                    Submit
                </span>
                <i
                    className="bi bi-x-circle  text-xl text-red-700 cursor-pointer"
                    onClick={(event) => {
                        let overlay = event.target.closest(".me-overlay");
                        //overlay.remove();
                        let existingPopup = document.body.querySelector(".popup-container");
                        if (existingPopup) existingPopup.remove();
                        let popup = getPopupElement();
                        ReactDOM.render(<CloseMockTestPopupHTML overlay={overlay} />, popup);
                    }}
                ></i>
            </div>

            <div className="content mock-test ">
                <div className="question-numbers flex justify-start items-center gap-2 flex-wrap  px-3 py-2 border-b-2  max-h-[120px] overflow-y-scroll">
                    {mock_obj.que_ids.map((que_id, index) => (
                        <span
                            className="  question-number dot  bg-gray-200 text-gray-700 rounded-md cursor-pointer text-[10px] py-1 px-2"
                            id={index}
                            key={index}
                            onClick={(event) => {
                                let i = index;
                                let question_div = event.target.closest(".me-overlay").querySelectorAll(".que-div")[i];
                                question_div.scrollIntoView({ behavior: "auto", block: "center" });
                                question_div.style.backgroundColor = "#ffe7c9";
                                setTimeout(() => {
                                    question_div.style.backgroundColor = "";
                                }, 2000);
                            }}
                        >
                            {index + 1 <= 9 ? `0${index + 1}` : index + 1}
                        </span>
                    ))}
                </div>
                <div className="question-list  block max-h-[calc(100vh-170px)] overflow-y-auto py-2">
                    {mock_obj.que_ids.map((que_id, index) => (
                        <div className="question-div" key={index} id={index}>
                            {GetMCQHTML({ que: que_id, type: "mock", index: index + 1, is_icse: false, is_show_tags: false })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function CloseMockTestPopupHTML({ overlay }) {
    return (
        <div className="flex flex-col justify-center items-center gap-2 bg-white p-2 rounded-md">
            <div className="text-md">Are you sure you want to exit the mock test?</div>
            <div className="flex justify-center items-center gap-2">
                <button
                    className="bg-blue-500 text-white px-4 py-1  rounded-md"
                    onClick={(event) => {
                        overlay.remove();
                        closePopup(event);
                    }}
                >
                    Yes
                </button>
                <button className="bg-red-500 text-white px-4 py-1 ml-auto rounded-md" onClick={(event) => closePopup(event)}>
                    No
                </button>
            </div>
        </div>
    );
}

async function createSharedMockTestUrl(mock_obj) {
    let ref = database.ref(`${base_data_ref}/shared_mocks`);
    let data = await getDataFromFirebaseUsingRef(ref);
    data = data ? data : [];

    let index = data.findIndex((item) => item.id === mock_obj.id);
    if (index === -1) {
        // If not found, add the mock_obj to the data
        data.push(mock_obj);
        console.log("Mock object added:", mock_obj);
    } else {
        console.log("Mock object already exists at index:", index);
    }

    await ref.set(data);

    let shared_mock_url = window.location.href + `/shared_mock/${mock_obj.id}`;
    console.log(shared_mock_url);
    navigator.clipboard.writeText(shared_mock_url);
    popupAlert("Shared Mock Test URL copied to clipboard", 3, "green");
}

function closePopup(event) {
    event.target.closest(".popup-container").remove();
}

function submitMockTest(event, mock) {
    clearInterval(mock_timer_interval);
    //let questions_list_div = event.target.closest(".me-overlay").querySelector(".question-list");

    let all_questions_divs = event.target.closest(".me-overlay").querySelectorAll(".que-div");
    let mock_obj = {
        id: mock.id,
        name: mock.name,
        questions: [],
        date: getTodayDateAndTime(),
    };

    let ques = mock_obj.questions;

    all_questions_divs.forEach((que_div) => {
        let all_options_div = que_div.querySelectorAll(".options .option");

        let selected_option_index = null;
        all_options_div.forEach((option, index) => {
            if (option.classList.contains("selected")) selected_option_index = index;
        });

        let obj = {
            id: que_div.id,
            selected_option_index: selected_option_index,
        };

        if (obj.selected_option_index != null) {
            addMcqToDailyPractisedQuestions(obj);
        } else {
            obj.selected_option_index = "";
        }
        ques.push(obj);
    });

    mock_obj.questions = ques;
    userdata.mock_tests = userdata.mock_tests ? userdata.mock_tests : [];
    userdata.mock_tests.unshift(mock_obj);
    saveUserData();

    let overlay = event.target.closest(".me-overlay");
    ReactDOM.render(<MockTestResultHTML mock_obj={mock_obj} />, overlay);
}
function MockTestResultHTML({ mock_obj }) {
    let attempted_count = 0,
        skipped_count = 0,
        correct_count = 0,
        wrong_count = 0;

    mock_obj.questions.forEach((q) => {
        let que = getQuestionById(q.id);
        if (q.selected_option_index !== "") {
            attempted_count++;
            if (q.selected_option_index == que.correct_option_index) {
                correct_count++;
            } else {
                wrong_count++;
            }
        } else {
            skipped_count++;
        }
    });

    //skipped_count = mock_obj.questions.length - attempted_count;

    return (
        <div className="container ">
            <div className="top-section flex justify-between items-center  p-3 gap-2 border-b-2">
                <span className="text-xl font-bold">Mock Test Result</span>
                <i
                    className="bi bi-x-circle text-xl ml-auto px-2 cursor-pointer"
                    onClick={(event) => {
                        event.target.closest(".me-overlay").remove();
                    }}
                ></i>
            </div>

            <div className="result-details flex flex-col gap-2  p-2 m-2 ">
                <div className="flex  justify-start items-center gap-2">
                    <span>Total questions:</span>
                    <span className=" text-sm font-bold bg-gray-200 px-2 py-1 rounded-md cursor-pointer pressing-effect" onClick={(event) => filterMockResultMCQs("all", mock_obj)}>
                        {mock_obj.questions.length}
                    </span>
                </div>
                <div className="flex justify-start items-center gap-2">
                    <div className="flex justify-start items-center gap-2">
                        <span>Attempted:</span>
                        <span className=" text-sm font-bold bg-gray-200 px-2 py-1 rounded-md cursor-pointer pressing-effect" onClick={(event) => filterMockResultMCQs("attempted", mock_obj)}>
                            {attempted_count}
                        </span>
                    </div>
                    <div className="flex justify-start items-center gap-2">
                        <span>Skipped:</span>
                        <span className=" text-sm font-bold bg-gray-200 px-2 py-1 rounded-md cursor-pointer pressing-effect" onClick={(event) => filterMockResultMCQs("skipped", mock_obj)}>
                            {skipped_count}
                        </span>
                    </div>
                </div>
                <div className="flex justify-start items-center gap-2">
                    <div className="flex justify-start items-center gap-2">
                        <span>Correct:</span>
                        <span className=" text-sm font-bold bg-green-200 px-2 py-1 rounded-md cursor-pointer pressing-effect" onClick={(event) => filterMockResultMCQs("correct", mock_obj)}>
                            {correct_count}
                        </span>
                    </div>
                    <div className="flex justify-start items-center gap-2">
                        <span>Wrong:</span>
                        <span className=" text-sm font-bold bg-red-200 px-2 py-1 rounded-md cursor-pointer pressing-effect" onClick={(event) => filterMockResultMCQs("wrong", mock_obj)}>
                            {wrong_count}
                        </span>
                    </div>
                </div>
                <div className="flex flex-col justify-start items-start gap-2">
                    <span className="text-md font-bold">Marks: {`${(correct_count * 2 - wrong_count * 0.6).toFixed(2).replace(/\.0+$/, "").replace(/\.00$/, "")} out of ${mock_obj.questions.length * 2}`}</span>
                    <span className="text-md font-bold">Percentage: {`${((correct_count / mock_obj.questions.length) * 100).toFixed(1)}%`}</span>
                </div>
                <span className="text-[10px] text-gray-400">Corred answer (+2) marks and wrong ans (-0.6) marks</span>
            </div>

            <span className="mock-result-questions-title text-xl m-2 p-2 font-bold text-gray-700">Questions:</span>
            <div className="mock-result-questions-list block max-h-[62vh] overflow-y-auto">
                {mock_obj.questions.map((que, index) => (
                    <div className={`question-div m-2 ${que.selected_option_index ? (que.selected_option_index == que.answer_option_index ? "correct" : "wrong") : ""}`} key={index}>
                        {GetMCQHTML({ que: que.id, type: "mock-result", index: index + 1, selected_option_index: que.selected_option_index, is_show_icons: true, is_show_tags: false })}
                    </div>
                ))}
            </div>
        </div>
    );
}

function filterMockResultMCQs(type, mock_obj) {
    let target_div = document.querySelector(".mock-result-questions-list");

    if (target_div) emptyReactContainer(target_div);
    else return;
    let fil_ques = [];
    let title_element = document.querySelector(".mock-result-questions-title");
    if (type == "all") {
        title_element.textContent = "Questions: ALL";
        fil_ques = mock_obj.questions;
    } else if (type == "attempted") {
        title_element.textContent = "Questions: Attempted";
        fil_ques = mock_obj.questions.filter((que) => que.selected_option_index !== "");
    } else if (type == "skipped") {
        title_element.textContent = "Questions: Skipped";
        fil_ques = mock_obj.questions.filter((que) => que.selected_option_index === "");
    } else if (type == "correct") {
        title_element.textContent = "Questions: Correct";
        fil_ques = mock_obj.questions.filter((que) => {
            if (que.selected_option_index === "") return false;
            let que_data = getQuestionById(que.id);
            return que.selected_option_index === que_data.correct_option_index;
        });
    } else if (type == "wrong") {
        title_element.textContent = "Questions: Wrong";
        fil_ques = mock_obj.questions.filter((que) => {
            if (que.selected_option_index === "") return false;
            let que_data = getQuestionById(que.id);
            return que.selected_option_index !== que_data.correct_option_index;
        });
    }

    ReactDOM.render(<MockTestResultMCQsHTML fil_ques={fil_ques} />, target_div);
}

function MockTestResultMCQsHTML({ fil_ques }) {
    return (
        <div className="container">
            {fil_ques.map((que, index) => (
                <div className={`question-div m-2 ${que.selected_option_index ? (que.selected_option_index == que.answer_option_index ? "correct" : "wrong") : ""}`} key={index}>
                    {GetMCQHTML({ que: que.id, type: "mock-result", index: index + 1, selected_option_index: que.selected_option_index, is_show_icons: true, is_show_tags: false })}
                </div>
            ))}
        </div>
    );
}

function convertPower(a, b) {
    return `<span class="inline-block mx-2">
                    <span>${a}</span>
                    <sup>${b}</sup>
                </span>`;
}

function convertFractions(a, b) {
    return `
    <span class="inline-block mx-2">
      <span class="block">${a}</span>
      <span class="block border-t border-gray-600">${b}</span>
    </span>
  `;
}

let mock_timer_interval = null;
function setTimer(minutes) {
    const timerElement = document.querySelector(".mock-overlay .timer-text");
    const endTime = Date.now() + minutes * 60 * 1000;

    function updateTimer() {
        const timeLeft = endTime - Date.now();
        if (timeLeft <= 0) {
            timerElement.textContent = "00:00";
            clearInterval(timerInterval);
            document.querySelector(".mock-overlay .submit-test").click();
            return;
        }

        const mins = Math.floor((timeLeft / 1000 / 60) % 60);
        const secs = Math.floor((timeLeft / 1000) % 60);

        if (mins == 0 && secs == 1) {
            document.querySelector(".submit-test").click();
        }

        const formattedTime = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        timerElement.textContent = formattedTime;
    }

    updateTimer();
    mock_timer_interval = setInterval(updateTimer, 1000);
}
function createSharedMockTest() {
    console.log("createSharedMockTest");
}

function getAllChildTags(tag) {
    let tag_array = [];
    function findChildTags(tag, tag_item, is_child_tag) {
        tag_item = tag_item.name ? tag_item : tag_item[0];

        if (is_child_tag) {
            tag_array.push(tag_item.name.replace("[[", "").replace("]]", ""));
            let children = tag_item.children ? tag_item.children : [];
            children.forEach((child) => {
                findChildTags(tag, child, is_child_tag);
            });
            return;
        }
        is_child_tag = tag.toLowerCase() === tag_item.name.toLowerCase() ? true : false;
        if (is_child_tag) {
            tag_array.push(tag_item.name.replace("[[", "").replace("]]", ""));
            let children = tag_item.children ? tag_item.children : [];
            children.forEach((child) => {
                findChildTags(tag, child, is_child_tag);
            });
            return;
        }
        let children = tag_item.children ? tag_item.children : [];
        children.forEach((child) => {
            findChildTags(tag, child, is_child_tag);
        });
    }

    tags_list.forEach((tag_item) => {
        let is_child_tag = tag.toLowerCase() === tag_item.name.toLowerCase() ? true : false;
        findChildTags(tag, tag_item, is_child_tag);
    });
    console.log(tag_array);
    return tag_array;
}

function reloadAppUrl(event) {
    window.location.reload();
}

function getPopupElement(arg) {
    // Create a container for the popup and overlay
    const container = document.createElement("div");
    container.className = "popup-container";

    // Create the popup
    const popup = document.createElement("div");
    popup.className = "popup";

    // Append popup to container
    container.appendChild(popup);
    document.body.appendChild(container);

    if (arg && arg == "first-time") return popup;
    container.addEventListener("click", (e) => {
        if (e.target === container) {
            container.remove(); // Remove the popup container
        }
    });

    return popup;
}

async function checkAnswer(event, que, type) {
    let all_options = event.target.closest(".options").querySelectorAll(".option");

    let selected_option = event.target.closest(".option");
    let selected_option_index = 0;

    all_options.forEach((option, index) => {
        if (option === selected_option) selected_option_index = index;
    });

    if (type === "mock") {
        let index = parseInt(selected_option.closest(".question-div").id);
        selected_option.classList.toggle("selected");

        if (!selected_option.classList.contains("selected")) {
            event.target.closest(".mock-overlay").querySelectorAll(".dot")[index].classList.remove("selected");
            return;
        }

        all_options.forEach((option) => {
            option.classList.remove("selected");
        });
        selected_option.classList.add("selected");

        event.target.closest(".mock-overlay").querySelectorAll(".dot")[index].classList.add("selected");

        return;
    }

    // Add selected and correct/wrong classes to the selected option
    selected_option.classList.add("selected");
    if (selected_option_index === que.correct_option_index) {
        all_options[selected_option_index].classList.add("correct");
    } else {
        all_options[selected_option_index].classList.add("wrong");
        all_options[que.correct_option_index].classList.add("correct");
    }

    // Disable all options once selected
    all_options.forEach((option) => {
        option.classList.add("disabled");
    });

    // Show explanation, linked block, external link and linked video icons if available
    let explanation_icon = event.target.closest(".mcq-div").querySelector(".full-icons-div .explanation");
    if (explanation_icon && (que.explanation.trim() != "" || que.linked_block_uid.trim() != "")) explanation_icon.classList.remove("hide");

    let linked_block_icon = event.target.closest(".mcq-div").querySelector(".full-icons-div .linked-block");
    //if (linked_block_icon && que.explanation.trim() != "" && que.linked_block_uid && que.linked_block_uid.trim() != "") linked_block_icon.classList.remove("hide");

    let external_link_icon = event.target.closest(".mcq-div").querySelector(".full-icons-div .external-link");
    if (external_link_icon && que.external_link && que.external_link.trim() != "") external_link_icon.classList.remove("hide");

    let linked_video_icon = event.target.closest(".mcq-div").querySelector(".full-icons-div .video");
    if (linked_video_icon && que.linked_video && que.linked_video.trim() != "") linked_video_icon.classList.remove("hide");

    // Update selected options count percentage in firebase
    let user_ref = database.ref(`${base_data_ref}/mcqs_info/${que.id}`);
    let obj = await getDataFromFirebaseUsingRef(user_ref);
    obj = obj ? obj : { selected_options_count: [] };

    if (obj.selected_options_count.length == 0) {
        obj.selected_options_count = new Array(all_options.length).fill(0);
        obj.selected_options_count[selected_option_index] = 1;
    } else {
        obj.selected_options_count[selected_option_index] = obj.selected_options_count[selected_option_index] + 1;
    }
    await user_ref.set(obj);

    // Show selected percentage of all options in firestore

    let total_responses = obj.selected_options_count.reduce((acc, curr) => acc + curr, 0);
    all_options.forEach((option, index) => {
        let percentage = (obj.selected_options_count[index] / total_responses) * 100;
        option.querySelector(".percentage-attempted").textContent = Math.round(percentage) + "%";
    });

    let options_div = event.target.closest(".options");
    let span = options_div.querySelector(".total-responses");
    if (!span) {
        span = document.createElement("span");
        span.className = "total-responses text-gray-500 text-sm";
        span.textContent = `Total responses: ${total_responses}`;
        options_div.appendChild(span);
    } else {
        span.textContent = `Total responses: ${total_responses}`;
    }

    addMcqToDailyPractisedQuestions({ id: que.id, selected_option_index: selected_option_index });
}

function showMCQExplanation(que, event) {
    let div = event.target.closest(".mcq-item").querySelector(".mcq-explanation-div");
    if (div) {
        div.remove();
        return;
    }

    div = document.createElement("div");
    div.className = "mcq-explanation-div bg-violet-50 py-2 px-3 rounded-md block w-full h-full";
    event.target.closest(".mcq-item").appendChild(div);
    ReactDOM.render(<LoadMCQExplanationHtml que={que} />, div);
}
function LoadMCQExplanationHtml({ que }) {
    let explanation = que.explanation;
    let linked_block_text = "";
    if (que.linked_block_uid.trim() != "") {
        let block = app_data.linked_blocks_text.find((block) => block.uid == que.linked_block_uid);
        linked_block_text = block ? block.string : "";
    }
    let interval = setInterval(() => {
        let ele = document.querySelector(".mcq-explanation-div-inner");
        if (ele) {
            clearInterval(interval);

            let video_elements = ele.querySelectorAll(".video");
            video_elements.forEach((video) => {
                video.addEventListener("click", (event) => {
                    let video_id = video.getAttribute("video-id");
                    let time = parseInt(video.getAttribute("time")) || 0;
                    if (video_id) {
                        playVideoPlayer(video_id, time, event);
                    }
                });
            });
        }
    }, 100);
    return (
        <div className="mcq-explanation-div-inner block w-full h-full pt-1">
            <div className="block w-full h-full ">
                <div className="flex justify-start items-center gap-2">
                    <span className="font-semibold text-gray-500">Explanation:</span>
                </div>
            </div>

            <div className="block explanation-text w-full h-full  max-h-[40vh] overflow-y-auto py-2">
                <div className="flex justify-start items-center gap-2 flex-wrap">
                    <span className="text-gray-500 text-sm" dangerouslySetInnerHTML={{ __html: getHTMLFormattedText(explanation) }}></span>
                </div>
                {explanation !== "" && linked_block_text !== "" && <div className="block my-5 border-t border-gray-500 divider-line"></div>}
                <div className="me-iframe-div"></div>
                {linked_block_text !== "" && (
                    <div className="flex flex-col justify-start items-start gap-2">
                        <div className="icons flex justify-start items-center gap-2">
                            <div
                                className="bookmark inline-block h-full w-fit mx-1"
                                onClick={(event) => {
                                    userdata.bookmarked_notes_block = userdata.bookmarked_notes_block ? userdata.bookmarked_notes_block : [];
                                    if (!userdata.bookmarked_notes_block.includes(que.linked_block_uid)) userdata.bookmarked_notes_block.unshift(que.linked_block_uid);
                                    saveUserData();
                                    popupAlert("Added to saved notes block", 3, "green");
                                }}
                            >
                                <div className="flex justify-center items-center gap-2 border border-gray-500 rounded-md px-2 text-gray-500 cursor-pointer">
                                    <i className="bi bi-bookmark"></i>
                                    <span className="text-sm">Save notes</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-start items-center gap-2 flex-wrap">
                            <span className="text-gray-500 text-sm" dangerouslySetInnerHTML={{ __html: getHTMLFormattedText(linked_block_text) }}></span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ConfirmFilterMCQsByTags({ tag }) {
    return (
        <div className="block w-full h-full">
            <div className="flex flex-col justify-start items-center gap-2">
                <span className="text-sm">Are you sure you want to filter MCQs by tag:</span>
                <span
                    className="text-blue-500 w-fit mx-1 border border-blue-500 rounded-md px-2 py-1 cursor-pointer"
                    onClick={(event) => {
                        closePopup(event);
                        filterMcqsByTag(tag, event);
                    }}
                >
                    {tag}
                </span>
            </div>
        </div>
    );
}

function getCurrentDateTimeAsString() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0"); // Months are zero-based
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");

    return `${yyyy}_${mm}_${dd}_${hh}_${min}_${ss}`;
}

function copyExamLink(exam, event) {
    let link = new URL(window.location.href).origin + `/#/${exam}/home`;
    navigator.clipboard.writeText(link);
    if (navigator.share) {
        navigator.share({
            title: "Elahi Study App",
            url: link,
        });
        popupAlert(`${exam} exam link copied to clipboard`);
    } else {
        popupAlert(`${exam} exam link copied to clipboard`);
    }
}
//})();

// Notes Page Section
async function loadSearchNotesSection(event) {
    openSubPage("notes", "search-notes", event);

    let ele = document.querySelector(".main-content .pages .page.notes .sub-page.search-notes input");
    if (ele) return;

    let div = document.querySelector(".main-content .pages .page.notes .sub-page.search-notes");
    if (div) emptyReactContainer(div);
    ReactDOM.render(<LoadSearchNotesSectionHTML />, div);
}
function LoadSearchNotesSectionHTML() {
    return (
        <div className="block w-full h-full">
            <div className="w-full block h-full">
                <div className="flex justify-center items-center gap-2 h-full w-full mt-2">
                    <div className="flex justify-center items-center gap-2  border rounded-full px-4">
                        <i className="bi bi-search text-gray-500 text-xl"></i>
                        <input type="text" className="w-full border-none outline-none px-3 py-2 rounded-md" placeholder="Search in Notes" />
                    </div>
                    <button className="bg-[#3290EC] text-white rounded-full px-4 py-2" onClick={(event) => searchNotes(event)}>
                        Search
                    </button>
                </div>
            </div>
            <div className="w-full h-full block max-h-[calc(100vh-170px)] overflow-y-scroll search-notes-results-list px-4 py-2 border-t mt-2"></div>
        </div>
    );
}
