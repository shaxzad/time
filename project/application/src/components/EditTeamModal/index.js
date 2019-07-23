import React, { Component } from 'react';
import { connect } from 'react-redux';

// import jwtDecode from 'jwt-decode';

import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import { createMuiTheme } from '@material-ui/core';
import { ThemeProvider } from '@material-ui/styles';

// Services
import { ROLES } from '../../services/authentication';
import { apiCall } from '../../services/apiService';
// import { setTokenToLocalStorage } from '../../services/tokenStorageService';

// Components

// Actions
import { setUserDataAction } from '../../actions/UserSettingAction';

// Queries

// Config
import { AppConfig } from '../../config';

// Styles
import './style.css';

const materialTheme = createMuiTheme({
    overrides: {
        MuiSvgIcon: {
            root: {
                fontSize: '24px',
            },
        },
    },
});

const USER_STATUS = {
    ACTIVE: 'ACTIVE',
    NOT_ACTIVE: 'NOT_ACTIVE',
};

class EditTeamModal extends Component {
    state = {
        id: null,
        value: ROLES.ROLE_MEMBER,
        valueStatus: USER_STATUS.NOT_ACTIVE,
    };

    closeModal() {
        this.props.teamPageAction('TOGGLE_EDIT_USER_MODAL', { editUserModal: false });
    }

    addUser = teamPage => {
        const { vocabulary, setUserDataAction } = this.props;

        apiCall(AppConfig.apiURL + `user/${this.state.id}/team`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: this.email.value,
                username: this.name.value,
                isActive: this.state.valueStatus === USER_STATUS.ACTIVE,
                roleName: this.state.value,
            }),
        }).then(
            result => {
                if (result.mesage) {
                    alert(vocabulary[result.mesage]);
                } else {
                    setUserDataAction(result);
                }
                this.closeModal();
                this.props.getDataFromServer(teamPage);
            },
            err => {
                if (err instanceof Response) {
                    err.text().then(errorMessage => {
                        const textError = JSON.parse(errorMessage).message;
                        alert(vocabulary[textError]);
                    });
                } else {
                    console.log(err);
                }
            }
        );
    };

    handleChange = event => {
        this.setState({ value: event.target.value });
    };

    handleChangeStatus = event => {
        this.setState({ valueStatus: event.target.value });
    };

    componentDidMount() {
        const currentUser = this.props.editedUser.user[0] || {};
        const { id, username, email } = currentUser;
        const role = this.props.editedUser.role_collaboration.title;
        const isActive = this.props.editedUser.is_active;

        this.setState({
            id,
            value: role,
            valueStatus: isActive ? USER_STATUS.ACTIVE : USER_STATUS.NOT_ACTIVE,
        });
        this.email.value = email;
        this.name.value = username;
    }

    render() {
        const { vocabulary } = this.props;
        const { v_name, v_team_role, v_team_access, v_edit_user } = vocabulary;
        return (
            <div className="edit_team_modal_wrapper">
                <div className="edit_team_modal_data">
                    <i onClick={e => this.closeModal()} />
                    <div className="edit_team_modal_input_container">
                        <div className="edit_team_modal_input_title">E-mail</div>
                        <input
                            type="text"
                            ref={input => {
                                this.email = input;
                            }}
                            className="edit_team_modal_input"
                        />
                    </div>
                    <div className="edit_team_modal_input_container">
                        <div className="edit_team_modal_input_title">{v_name}</div>
                        <input
                            type="text"
                            ref={input => {
                                this.name = input;
                            }}
                            className="edit_team_modal_input"
                        />
                    </div>
                    <div className="edit_team_modal_input_container">
                        <div className="edit_team_modal_input_title">{v_team_role}</div>
                        <ThemeProvider theme={materialTheme}>
                            <RadioGroup onChange={this.handleChange} value={this.state.value}>
                                <FormControlLabel
                                    value={ROLES.ROLE_ADMIN}
                                    control={<Radio color="primary" />}
                                    label="Admin"
                                />
                                <FormControlLabel
                                    value={ROLES.ROLE_MEMBER}
                                    control={<Radio color="primary" />}
                                    label="User"
                                />
                            </RadioGroup>
                        </ThemeProvider>
                    </div>
                    <div className="edit_team_modal_input_container">
                        <div className="edit_team_modal_input_title">{v_team_access}</div>
                        <ThemeProvider theme={materialTheme}>
                            <RadioGroup onChange={this.handleChangeStatus} value={this.state.valueStatus}>
                                <FormControlLabel
                                    value={USER_STATUS.ACTIVE}
                                    control={<Radio color="primary" />}
                                    label="Active"
                                />
                                <FormControlLabel
                                    value={USER_STATUS.NOT_ACTIVE}
                                    control={<Radio color="primary" />}
                                    label="Not active"
                                />
                            </RadioGroup>
                        </ThemeProvider>
                    </div>
                    <button onClick={e => this.addUser(this.props.teamPage)}>{v_edit_user}</button>
                </div>
            </div>
        );
    }
}

const mapStateToProps = state => ({
    vocabulary: state.languageReducer.vocabulary,
});

const mapDispatchToProps = {
    setUserDataAction,
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(EditTeamModal);
