import React, {Component} from 'react'
import './style.css'

class CreateProjectModal extends Component {
    state = {
        selectedValue: 'green',
        listOpen: false,
    };
    selectValue = ['green', 'red', 'blue', 'pink'];

    setItem(value) {
        this.setState(
            {
                selectedValue: value
            }
        )
    }

    toggleSelect() {
        this.setState(
            {
                listOpen: !this.state.listOpen
            }
        )
    }

    render() {
        let selectItems = this.selectValue.map((value) =>
            <div className={`item`} onClick={e => this.setItem(value)}>
                <div className={`circle ${value}`}></div>
            </div>
        );
        return (
            <div className="wrapper_create_projects_modal">
                <div className="create_projects_modal_background"></div>
                <div className="create_projects_modal_container">
                    <div className="create_projects_modal_header">
                        <div className="create_projects_modal_header_title">
                            Create project
                        </div>
                        <i className="create_projects_modal_header_close"></i>
                    </div>
                    <div className="create_projects_modal_data">
                        <div className="create_projects_modal_data_input_container">
                            <input type="text" placeholder={'Project name...'}/>
                            <div className="create_projects_modal_data_select_container"
                                 onClick={e => this.toggleSelect()}>
                                <div className="select_main">
                                    <div className={`circle ${this.state.selectedValue}`}>
                                    </div>
                                </div>
                                {this.state.listOpen && <div className="select_list">{selectItems}</div>}
                            </div>
                        </div>
                    </div>
                    <div className="create_projects_modal_button_container">
                        <button className="create_projects_modal_button_container_button">Create project</button>
                    </div>
                </div>
            </div>
        )
    }
}

export default CreateProjectModal;