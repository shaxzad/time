import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import './index.css';
import * as serviceWorker from './serviceWorker';
import { Redirect, Route, BrowserRouter as Router } from 'react-router-dom';
import { store } from './store/configureStore';
import MainPage from './pages/MainPage';
import ReportsPage from './pages/ReportsPage';
import ProjectsPage from './pages/ProjectsPage';
import TeamPage from './pages/TeamPage';
import ReportsByProjectsPage from './pages/ReportsByProjectPage';
import AuthorisationPage from './pages/AuthorisationPage';

ReactDOM.render(
    <Provider store={store}>
        <Router>
            <div>
                <Redirect from="" to="/login" />
                <Route path="/login" component={AuthorisationPage} />
                <Route path="/main-page" component={MainPage} />
                <Route path="/reports" component={ReportsPage} />
                <Route path="/projects" component={ProjectsPage} />
                <Route path="/team" component={TeamPage} />
                <Route path="/project-report/:name/:dateStart/:endDate/" component={ReportsByProjectsPage} />
            </div>
        </Router>
    </Provider>,
    document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA

serviceWorker.unregister();
