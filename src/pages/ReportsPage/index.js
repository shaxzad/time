import React, { Component } from 'react';
import * as _ from 'underscore';
import { connect } from 'react-redux';
import { Bar } from 'react-chartjs-2';
import './style.css';
import LeftBar from '../../components/LeftBar';
import ProjectsContainer from '../../components/ProjectsContainer';
import { client } from '../../requestSettings';
import { getDateAndTimeToGraphick, getProjectANndTimeToGraphick, getProjects } from '../../queries';
import reportsPageAction from '../../actions/ReportsPageAction';
import { getTimeInSecondFromString, createArrTimeAndDate } from '../../services/timeService';

class ReportsPage extends Component {
    state = {
        toggleBar: false,
        projectsArr: [],
        toggleChar: false,
    };
    lineChartOption = {
        scales: {
            xAxes: [
                {
                    gridLines: {
                        display: false,
                    },
                    ticks: {
                        beginAtZero: false,
                        fontColor: '#BDBDBD',
                    },
                },
            ],
            yAxes: [
                {
                    gridLines: {
                        color: '#BDBDBD',
                    },
                    ticks: {
                        beginAtZero: false,
                        fontColor: '#BDBDBD',
                    },
                },
            ],
        },
        legend: {
            display: true,
            labels: {
                fontColor: '#BDBDBD',
            },
        },
    };

    changeDoughnutChat(chartObject, dataFromServer) {
        let newObjectChart = chartObject;
        newObjectChart.labels = createArrTimeAndDate(dataFromServer.timeTracker, 'firstArr', 'project', 'timePassed');
        newObjectChart.datasets[0].data = createArrTimeAndDate(
            dataFromServer.timeTracker,
            'secondArr',
            'project',
            'timePassed'
        );
        return newObjectChart;
    }

    changeGraph(object) {
        let newObject = object;
        newObject.labels = createArrTimeAndDate(this.props.dataFromServer, 'firstArr', 'date', 'timePassed');
        newObject.datasets[0].data = createArrTimeAndDate(this.props.dataFromServer, 'secondArr', 'date', 'timePassed');
        return newObject;
    }

    creatProJectsSumm(arr) {
        for (let i = 0; i < arr.length; i++) {}
    }

    getProjectsNamesById(data) {
        for (let i = 0; i < data.timeTracker.length; i++) {
            let projectId = +data.timeTracker[i].project;
            data.timeTracker[i].project = _.where(this.state.projectsArr, { id: projectId })[0].name;
            data.timeTracker[i].colorProject = _.where(this.state.projectsArr, { id: projectId })[0].colorProject;
            data.timeTracker[i].timePassed = getTimeInSecondFromString(data.timeTracker[i].timePassed);
        }
        return data;
    }

    getItemsFromArr(arr) {
        let finishArr = [];
        let projects = createArrTimeAndDate(arr, 'firstArr', 'project', 'timePassed');
        let time = createArrTimeAndDate(arr, 'secondArr', 'project', 'timePassed');
        console.log(time);
        for (let i = 0; i < projects.length; i++) {
            finishArr.push({ projects: projects[i], timePassed: time[i] });
        }
        return finishArr;
    }

    render() {
        return (
            <div className="wrapper_reports_page">
                <LeftBar />
                <div className="data_container_reports_page">
                    <div className="header">
                        <div className="header_name">Summary report</div>
                        <div className="selects_container" />
                    </div>
                    <div className="line_chart_container">
                        {this.state.toggleBar && (
                            <Bar data={this.props.dataBarChat} height={50} options={this.lineChartOption} />
                        )}
                    </div>
                    <div className="projects_chart_container">
                        {this.state.toggleChar && (
                            <ProjectsContainer
                                projectsArr={this.props.projectsArr}
                                dataDoughnutChat={this.props.dataDoughnutChat}
                            />
                        )}
                    </div>
                </div>
            </div>
        );
    }
    componentDidMount() {
        client.request(getDateAndTimeToGraphick).then(data => {
            for (let i = 0; i < data.timeTracker.length; i++) {
                data.timeTracker[i].timePassed = getTimeInSecondFromString(data.timeTracker[i].timePassed);
            }
            this.props.reportsPageAction('SET_DATA_FROM_SERVER', { data: data.timeTracker });
            this.props.reportsPageAction('SET_LINE_GRAPH', this.changeGraph(this.props.dataBarChat));
            this.setState({ toggleBar: true });
        });
        client.request(getProjects).then(data => {
            this.setState({ projectsArr: data.project });
        });
        client.request(getProjectANndTimeToGraphick).then(data => {
            data = this.getProjectsNamesById(data);
            console.log(this.getItemsFromArr(data.timeTracker));
            this.props.reportsPageAction('SET_PROJECTS', { data: this.getItemsFromArr(data.timeTracker) });
            this.changeDoughnutChat(this.props.dataDoughnutChat, data);
            let obj = this.changeDoughnutChat(this.props.dataDoughnutChat, data);
            this.props.reportsPageAction('SET_DOUGHNUT_GRAPH', { data: obj });
            this.setState({ toggleChar: true });
        });
    }
}

const mapStateToProps = store => {
    return {
        dataBarChat: store.reportsPageReducer.dataBarChat,
        lineChartOption: store.reportsPageReducer.lineChartOption,
        projectsArr: store.reportsPageReducer.projectsArr,
        dataDoughnutChat: store.reportsPageReducer.dataDoughnutChat,
        dataFromServer: store.reportsPageReducer.dataFromServer,
    };
};

const mapDispatchToProps = dispatch => {
    return {
        reportsPageAction: (actionType, toggle) => dispatch(reportsPageAction(actionType, toggle))[1],
    };
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(ReportsPage);
