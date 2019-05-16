import React from "react";
import { ipcRenderer } from "electron";
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

export default class extends React.Component {
  constructor(props) {
    super(props);
    this.state = { isSaving: false };
    ipcRenderer.on("jsonFiles", (event, jsonFiles) => {
      console.log("jsonFiles received", jsonFiles);
      this.setState({ jsonFiles });
    });
    ipcRenderer.on("data", (event, data) => {
      console.log("Data received", data);
      this.setState({ data });
    });
    ipcRenderer.on("saved", (event, data) => {
      // Set a timeout because it's weirdly instantaneous
      setTimeout(() => {
        this.setState({ isSaving: false });
      }, 500);
    });
  }
  save() {
    console.log("Saving", this.state.jsonFile.filename);
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
  handleSelect(filename) {
    if (filename === "Please select") {
      this.setState({
        jsonFile: null
      });
    } else {
      console.log("Loading", filename);
      let jsonFile = this.state.jsonFiles.filter(
        f => f.filename == filename
      )[0];
      if (!jsonFile.json || !Array.isArray(jsonFile.json)) {
        console.error("Only supports JSON array of objects!");
        return;
      }
      this.setState({
        jsonFile
      });
    }
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
      value = /^\d+$/.test(value) ? parseInt(value) : value;
      // Float
      value =
        !isNaN(value) && value.toString().indexOf(".") != -1
          ? parseFloat(value)
          : value;
    }

    jsonFile.json[objectIndex][key] = value;
    this.setState({ jsonFile });
  }
  render() {
    const { jsonFile } = this.state;
    let items;
    if (jsonFile && jsonFile.json) {
      items = _.cloneDeep(jsonFile.json);
      // console.log(items);
      // Sort items, alphabetical (default) with 'name' at the top
    }
    return (
      <div className="app" ref="app">
        <header>
          <h1>JSONEditor</h1>
          <select onChange={e => this.handleSelect(e.target.value)}>
            <option>Please select</option>
            {this.state.jsonFiles &&
              this.state.jsonFiles.map((f, i) => (
                <option key={i}>{f.filename}</option>
              ))}
          </select>
        </header>

        {this.state && items && (
          <div>
            <main>
              {items.map((item, objectIndex) => (
                <div className="object" key={objectIndex}>
                  {prioritiseArrayByValues(Object.keys(item), [
                    "id",
                    "name"
                  ]).map((key, j) => {
                    let value = item[key];
                    value = value ? value : "";
                    return (
                      <p key={j} className={`-${objectIndex} -${j}`}>
                        <label>{key}</label>
                        <textarea
                          value={value}
                          key={`-${objectIndex} -${j}`}
                          className={`-${objectIndex} -${j} ${
                            Array.isArray(value) ? "-array" : ""
                          }`}
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
                      </p>
                    );
                  })}
                </div>
              ))}
            </main>
            <aside>
              <div className="controls">
                <button
                  onClick={this.save.bind(this)}
                  disabled={this.state.isSaving}
                >
                  {this.state.isSaving ? "Saving.." : "Save"}
                </button>
                <button onClick={this.duplicate.bind(this)}>Duplicate</button>
              </div>
            </aside>
          </div>
        )}
      </div>
    );
  }
}
