import * as React from "react";
import { ipcRenderer, remote } from "electron";
const _ = require("lodash");

const prioritiseArrayByValues = (array, values) => {
  values.reverse().forEach(value => {
    // Remove string from array, and add it back in to the start
    if (array.includes(value)) {
      array = array.filter(item => item !== value);
      array.unshift(value);
    }
  });
  return array;
};
const isInteger = value => /^\d+$/.test(value);
const isFloat = value => !isNaN(value) && value.toString().indexOf(".") != -1;

const dimensions = remote
  .getCurrentWindow()
  .webContents.getOwnerBrowserWindow()
  .getBounds();

export default class extends React.Component {
  constructor(props) {
    super(props);
    this.state = { isSaving: false, searchIteration: 0 };
    ipcRenderer.on("jsonFile", (event, jsonFile) => {
      // console.log("jsonFile received", jsonFile);
      this.setState({ jsonFile });
    });
    ipcRenderer.on("saved", (event, data) => {
      // Set a timeout because it's weirdly instantaneous
      setTimeout(() => {
        this.setState({ isSaving: false });
      }, 500);
    });
  }
  save() {
    console.log("Saving", this.state.jsonFile.name);
    this.setState({ isSaving: true });
    ipcRenderer.send("save", this.state.jsonFile);
  }
  duplicate() {
    let jsonFile = this.state.jsonFile;
    jsonFile.json.push(_.cloneDeep(jsonFile.json[jsonFile.json.length - 1]));
    this.setState({ jsonFile });
    setTimeout(() => {
      this.refs.app.scrollBy({ top: 9999, left: 0, behavior: "smooth" });
      window.scrollBy({ top: 9999, left: 0, behavior: "smooth" });
    }, 200);
  }
  handleFileSelect(file) {
    const { name, path } = file;
    // console.log("Requesting file", file);
    ipcRenderer.send("requestFile", {
      name,
      path
    });
  }
  handleChange({ value, objectIndex, key, type }) {
    // console.log(objectIndex, key, value);
    let jsonFile = this.state.jsonFile;

    //
    // Parsing
    //
    // Array
    if (type === "array") {
      if (!value || value === "") value = [];
      else {
        value = value.split(",");
        value = value.map(s => s.trim());
      }
    } else {
      // Integer
      value = isInteger(value) ? parseInt(value) : value;
      // Float
      value = isFloat(value) ? parseFloat(value) : value;
    }

    jsonFile.json[objectIndex][key] = value;
    this.setState({ jsonFile });
  }
  search(query) {
    if (query !== this.state.query) {
      this.searchIteration = 0;
    }
    this.setState({ query });

    console.log("Searching", query, "iteration", this.searchIteration);

    // window.find(query, false, false, true, false, true);
    let textareas = [];
    for (let i in this.refs) {
      if (i.substring(0, `textarea`.length) === `textarea`) {
        textareas.push(this.refs[i]);
      }
    }
    if (!textareas) return;
    let textareasInWhichWeFoundStuff = textareas.filter(
      t => query && t.value.toLowerCase().includes(query.toLowerCase())
    );

    if (this.searchIteration >= textareasInWhichWeFoundStuff.length) {
      this.searchIteration = 0;
    }
    textareas.forEach(t => {
      t.classList.remove("found");
      t.classList.remove("primary");
    });
    if (textareasInWhichWeFoundStuff.length) {
      textareasInWhichWeFoundStuff.forEach(t => t.classList.add("found"));
      textareasInWhichWeFoundStuff[this.searchIteration].classList.add(
        "primary"
      );

      const { height } = dimensions;
      let top =
        textareasInWhichWeFoundStuff[this.searchIteration].offsetTop -
        height / 2;
      top = top < 0 ? 0 : top;
      document.getElementById("App").scrollTo(0, top);
    }
  }
  searchIterate() {
    this.searchIteration++;
    this.search(this.state.query);
  }
  render() {
    let items, error, name;
    const { jsonFile } = this.state;
    if (jsonFile) {
      name = jsonFile.name;
      items = _.cloneDeep(jsonFile.json);
      // console.log(items);
      // Sort items, alphabetical (default) with 'name' at the top
    }
    if (!items) {
      error = "Hit Choose File above to begin.";
    } else if (!Array.isArray(items)) {
      error = "Only supports JSON with an array of objects, currently. Sorry!";
    }
    return (
      <div className="app" ref="app">
        <header>
          <h1>JSONEditor</h1>
          {/* <input type="file" directory="" webkitdirectory="" /> */}
          <span className="input file">
            <input
              type="file"
              name="file"
              id="file"
              accept=".json"
              onChange={e => this.handleFileSelect(e.target.files[0])}
            />
            <label htmlFor="file">Choose File</label>
            {name && <span className="filename">{name}</span>}
          </span>
          <span className="controls">
            {!error && (
              <span>
                <span className="input search">
                  <input
                    type="text"
                    placeholder="Search"
                    className="search"
                    id="search"
                    ref="search"
                    autoFocus
                    onChange={e => this.search(e.target.value)}
                    onKeyPress={e => e.key == "Enter" && this.searchIterate()}
                  />
                </span>
                <span className="input">
                  <button
                    onClick={this.save.bind(this)}
                    disabled={this.state.isSaving}
                  >
                    {this.state.isSaving ? "Saving.." : "Save"}
                  </button>
                </span>
                <span className="input">
                  <button onClick={this.duplicate.bind(this)}>
                    Duplicate Last Item
                  </button>
                </span>
              </span>
            )}
          </span>
        </header>
        <main ref="main">
          {error ? (
            <p className="error">{error}</p>
          ) : (
            this.state &&
            items &&
            items.map((item, objectIndex) => (
              <div className="object" key={objectIndex}>
                {prioritiseArrayByValues(Object.keys(item), ["id", "name"]).map(
                  (key, j) => {
                    let value = item[key];
                    value = value ? value : "";
                    return (
                      // <p key={j} className={`-${objectIndex} -${j}`}>
                      <React.Fragment key={j}>
                        <label>{key}</label>
                        <textarea
                          value={value}
                          key={`-${objectIndex} -${j}`}
                          ref={`textarea -${objectIndex} -${j}`}
                          className={`-${objectIndex} -${j}
                            ${Array.isArray(value) ? "-array" : ""}
                            ${isInteger(value) ? "-integer" : ""}
                            ${isFloat(value) ? "-float" : ""}
                            `}
                          onChange={e =>
                            this.handleChange({
                              value: e.target.value + "",
                              objectIndex,
                              key,
                              type: Array.isArray(value) ? "array" : null
                            })
                          }
                          rows="1"
                        />
                      </React.Fragment>
                    );
                  }
                )}
              </div>
            ))
          )}
        </main>
      </div>
    );
  }
}
