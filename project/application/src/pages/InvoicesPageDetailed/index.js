import React, { Component } from 'react';
import { Link, withRouter } from 'react-router-dom';
import TextareaAutosize from 'react-textarea-autosize';
import {
    addInvoice,
    getInvoice,
    updateInvoice,
    deleteInvoiceById,
    deleteAvatarThunk,
    setCopiedInvoiceId,
} from '../../actions/InvoicesActions';
import { showNotificationAction } from '../../actions/NotificationActions';
import { AppConfig } from '../../config';
import { spaceAndFixNumber, fixNumberHundredths, internationalFormatNum } from '../../services/numberHelpers';
//Styles
import './style.scss';

//Components
import { Loading } from '../../components/Loading';
import {
    CopyIcon,
    DeleteIcon,
    EditIcon,
    SaveIcon,
    SendIcon,
    SaveInvoice,
    CopyLinkIcon,
} from '../../components/InvoicePageComponents/AllInvoicesList';
import CustomScrollbar from '../../components/CustomScrollbar';
import DetailedInvoiceProjectsTable from '../../components/DetailedInvoiceProjectsTable';
import classNames from 'classnames';
import { getProjectsListActions } from '../../actions/ProjectsActions';
import { connect } from 'react-redux';
import CurrencySelect from '../../components/CurrencySelect';
import CalendarSelect from '../../components/CalendarSelect';
import { getCurrentTeamDetailedDataAction } from '../../actions/TeamActions';
import PersonSelect from '../../components/PersonSelect';
import { getClientsAction } from '../../actions/ClientsActions';
import ImagePicker from '../../components/ImagePicker';
import SendInvoiceModal from '../../components/InvoicePageComponents/SendInvoiceModal';
import ReactTooltip from 'react-tooltip';
import DeleteInvoiceModal from '../../components/DeleteInvoiceModal/index';
import { downloadPDF } from '../../services/downloadPDF';
import { downloadInvoicePDF } from '../../configAPI';
import DiscountInvoiceModal from '../../components/DiscountInvoiceModal';

//todo move to queries.js if needed
export const calculateTaxSum = ({ amount, rate, tax, hours }) => (((amount || hours) * rate) / 100) * tax;

//todo move to queries.js if needed
export const calculateSubtotal = ({ amount, rate, tax, hours }) =>
    (amount || hours) * rate + calculateTaxSum({ amount, rate, tax, hours }) || 0;
export const calculateSubtotalWithoutTax = ({ amount, rate, tax, hours }) => {
    return spaceAndFixNumber((amount || hours) * rate);
};
//todo move to queries.js if needed
export const calculateSubtotals = projects =>
    projects.reduce((sum, { amount, rate, hours }) => sum + (amount || hours) * rate, 0) || 0;

//todo move to queries.js if needed
export const calculateTaxesSum = projects => projects.reduce((sum, project) => sum + calculateTaxSum(project), 0) || 0;

export const subtotalWithDiscount = (subtotal, discount = 0) => (subtotal / 100) * discount;

const calculateTotal = (projects, discount = 0) => {
    let subtotal = calculateSubtotals(projects);

    return subtotal - subtotalWithDiscount(subtotal, discount) + calculateTaxesSum(projects);
};

//todo move to queries.js if needed
export const calculateSubtotalsWithTax = projects =>
    projects.reduce((sum, project) => sum + calculateSubtotal(project), 0);

const parseUsersData = users => {
    return users.data.map(user => user.user[0]);
};

class InvoicesPageDetailed extends Component {
    state = {
        isInitialFetching: true,
        invoice: {
            vendorId: this.props.defaultUserSender.id,
            invoiceNumber: '',
            id: ``,
            number: '',
            dateFrom: new Date(),
            dateDue: new Date(),
            timezoneOffset: new Date().getTimezoneOffset() * 60 * 1000,
            discount: 0,
            currency: 'usd',
            sender: {
                city: this.props.defaultUserSender.city || '',
                company_name: this.props.defaultUserSender.companyName || '',
                country: this.props.defaultUserSender.country || '',
                email: this.props.defaultUserSender.email || '',
                id: this.props.defaultUserSender.id || '',
                language: this.props.defaultUserSender.language || '',
                phone: this.props.defaultUserSender.phone || '',
                state: this.props.defaultUserSender.state || '',
                username: this.props.defaultUserSender.username || '',
                zip: this.props.defaultUserSender.zip || '',
            },
            recipient: null,
            image: null,
            projects: [],
            comment: '',
            removeFile: false,
        },
        errors: {
            sender: false,
            recipient: false,
            projects: false,
            hours: false,
        },
        sendInvoiceModalData: false,
        deleteInvoiceModal: false,
        linkCopied: false,
        discountModalIsOpen: false,
        copiedInvoice: false,
    };

    copyLinkRef = React.createRef();

    async componentDidMount() {
        let dateDue = new Date();
        dateDue.setDate(dateDue.getDate() + 1);
        this.setState({ invoice: { ...this.state.invoice, dateDue: dateDue } });
        setTimeout(() => this.setState({ isInitialFetching: false }), 500);
        const {
            getProjectsListActions,
            getCurrentTeamDetailedDataAction,
            getClientsAction,
            getInvoice,
            setCopiedInvoiceId,
            match: { params },
        } = this.props;

        if (this.isUpdateMode || this.isViewMode) {
            getInvoice(params['invoiceId']);
        }
        await getProjectsListActions();
        await getCurrentTeamDetailedDataAction();
        await getClientsAction();
        await setCopiedInvoiceId('');
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.props.invoice && this.props.invoice !== prevProps.invoice) {
            const {
                id,
                invoice_number,
                invoice_date,
                due_date,
                timezone_offset,
                currency,
                to,
                logo,
                projects,
                comment,
                discount,
                invoice_vendor,
            } = this.props.invoice;
            this.setState({
                invoice: {
                    id,
                    vendorId: this.props.defaultUserSender.id,
                    invoiceNumber: invoice_number,
                    dateFrom: invoice_date,
                    dateDue: due_date,
                    timezoneOffset: timezone_offset,
                    currency,
                    sender: invoice_vendor,
                    recipient: to,
                    image: logo,
                    projects,
                    comment,
                    discount,
                },
            });
        } else if (this.props.sameInvoiceNumberErr !== prevProps.sameInvoiceNumberErr) {
            this.setState({ invoice: prevState.invoice });
        } else if (prevProps.copiedInvoiceId !== this.props.copiedInvoiceId && this.state.copiedInvoice) {
            this.setState({ copiedInvoice: false }, () => {
                this.props.history.replace(`/invoices/update/${this.props.copiedInvoiceId}`);
                this.props.getInvoice(this.props.copiedInvoiceId);
                this.props.setCopiedInvoiceId('');
            });
        }
    }

    get isCreateMode() {
        return this.props.match.params.pageType === 'create';
    }

    get isViewMode() {
        return this.props.match.params.pageType === 'view';
    }

    get isUpdateMode() {
        return this.props.match.params.pageType === 'update';
    }

    handleInputChange = (name, e) => {
        let value = e.target.value;
        const { invoice } = this.state;
        this.setState({ invoice: { ...invoice, [name]: value } });
    };

    handleUpdateProject = project => {
        let { invoice } = this.state;

        invoice.projects.forEach((p, i) => {
            if (p.id === project.id) {
                invoice.projects[i] = project;
            }
        });

        this.setState({ invoice });

        return new Promise(resolve => {
            setTimeout(resolve, 500);
        });
    };

    handleAddProject = project => {
        let { invoice } = this.state;

        invoice.projects.push(project);
        this.setState({ invoice });

        return new Promise(resolve => {
            setTimeout(resolve, 500);
        });
    };

    handleRemoveProject = id => {
        let { invoice } = this.state;
        invoice.projects = invoice.projects.filter(project => project.id !== id);
        this.setState({ invoice });
    };

    onChangeCurrency = currency => {
        let { invoice } = this.state;
        invoice.currency = currency;

        this.setState({ invoice });
    };

    handleDateChange = (name, value) => {
        let { invoice } = this.state;
        invoice[name] = value;
        this.setState({ invoice });
    };

    handlePersonChange = (name, value) => {
        let { invoice } = this.state;
        invoice[name] = value;
        invoice.vendorId = this.props.defaultUserSender.id;
        invoice.sender.id = this.props.defaultUserSender.id;
        this.setState({ invoice });
    };

    handleFileLoad = image => {
        const { invoice } = this.state;
        this.setState({ invoice: { ...invoice, image } });
    };

    handleFileDelete = () => {
        const { invoice } = this.state;
        this.setState({ invoice: { ...invoice, image: null, removeFile: true } });
    };

    validateProjects = projectList => {
        return !!projectList.length && projectList.every(project => project.project_name && project.hours);
    };

    handleSaveAction = async () => {
        const { invoice } = this.state;
        const { updateInvoice, addInvoice, history, showNotificationAction } = this.props;
        const { v_fill_fields_company_name, v_invoice_number_exist } = this.props.vocabulary;
        let error =
            !invoice.sender ||
            !invoice.recipient ||
            !this.validateProjects(invoice.projects) ||
            !invoice.sender.company_name;
        if (!invoice.recipient) {
            this.setState(prevState => ({
                ...prevState,
                errors: {
                    ...prevState.errors,
                    recipient: true,
                },
            }));
        }
        if (!invoice.sender) {
            this.setState(prevState => ({
                ...prevState,
                errors: {
                    ...prevState.errors,
                    sender: true,
                },
            }));
        }
        if (!invoice.sender.company_name) {
            this.setState(prevState => ({
                ...prevState,
                errors: {
                    ...prevState.errors,
                    sender: true,
                },
            }));
        }

        if (!this.validateProjects(invoice.projects)) {
            this.setState(prevState => ({
                ...prevState,
                errors: {
                    ...prevState.errors,
                    projects: true,
                },
            }));
        }
        if (error) {
            if (!invoice.sender.company_name) {
                showNotificationAction({ text: v_fill_fields_company_name, type: 'error' });
                return;
            } else {
                return;
            }
        }
        if (this.isUpdateMode) {
            await updateInvoice(invoice);
            if (this.props.sameInvoiceNumberErr) {
                if (this.props.sameInvoiceNumberErr === 'ERROR.CHECK_REQUEST_PARAMS(INVOICE_NUM_ALREADY_EXISTS)') {
                    showNotificationAction({ text: v_invoice_number_exist, type: 'error' });
                } else {
                    showNotificationAction({ text: this.props.sameInvoiceNumberErr, type: 'error' });
                }
            } else {
                history.push(`/invoices/`);
            }
        } else if (this.isCreateMode) {
            await addInvoice({
                ...invoice,
                price: calculateSubtotalsWithTax(invoice.projects),
            });
            if (this.props.sameInvoiceNumberErr) {
                if (this.props.sameInvoiceNumberErr === 'ERROR.CHECK_REQUEST_PARAMS(INVOICE_NUM_ALREADY_EXISTS)') {
                    showNotificationAction({ text: v_invoice_number_exist, type: 'error' });
                } else {
                    showNotificationAction({ text: this.props.sameInvoiceNumberErr, type: 'error' });
                }
            } else {
                history.push(`/invoices/`);
            }
        }
    };

    handleDeleteInvoice = async () => {
        const { invoice } = this.state;
        const { deleteInvoiceById, history } = this.props;
        if (invoice.id) {
            await deleteInvoiceById(invoice.id);
            history.push('/invoices');
        }
    };

    handleCloneInvoice = () => {
        let dateDue = new Date();
        dateDue.setDate(dateDue.getDate() + 1);
        this.props.addInvoice(
            {
                ...this.state.invoice,
                dateFrom: new Date(),
                dateDue: dateDue,
            },
            true
        );
        this.setState({ copiedInvoice: true });
    };

    toggleSendInvoiceModal = (sendInvoiceModalData = null) => {
        this.setState({ sendInvoiceModalData });
    };

    closeDeleteModal = () => {
        this.setState({ deleteInvoiceModal: false });
    };

    goBack = () => {
        if (this.props.invoice && this.props.invoice.id) {
            const {
                id,
                invoice_number,
                invoice_date,
                due_date,
                timezone_offset,
                currency,
                to,
                logo,
                projects,
                comment,
                discount,
                invoice_vendor,
            } = this.props.invoice;
            this.setState({
                invoice: {
                    id,
                    vendorId: this.props.defaultUserSender.id,
                    invoiceNumber: invoice_number,
                    dateFrom: invoice_date,
                    dateDue: due_date,
                    timezoneOffset: timezone_offset,
                    currency,
                    sender: invoice_vendor,
                    recipient: to,
                    image: logo,
                    projects,
                    comment,
                    discount,
                },
            });
        }
        this.props.history.goBack();
    };

    copyToClipBoard = invoice => {
        if (this.state.linkCopied || !this.isViewMode) return;
        ReactTooltip.hide(this.copyLinkRef.current);
        const el = document.createElement('textarea');
        el.value = `${window.location.origin}/invoice/${invoice && invoice.id}`;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        this.setState({ linkCopied: true });
        setTimeout(() => {
            ReactTooltip.show(this.copyLinkRef.current);
        }, 0);
    };

    closeDiscountModal = () => {
        this.setState({ discountModalIsOpen: false });
    };

    saveDiscount = discount => {
        let { invoice } = this.state;
        invoice.discount = discount;

        this.setState({ invoice });

        this.closeDiscountModal();
    };

    render() {
        const { vocabulary, currentTeamDetailedData, clientsList, isFetching, showNotificationAction } = this.props;
        const {
            v_invoice,
            v_tax,
            v_subtotal,
            v_invoice_summary,
            v_total,
            v_comments,
            v_save,
            v_cancel,
            v_invoice_number,
            v_invoice_date,
            v_invoice_due,
            v_from,
            v_to,
            v_add_client,
            v_select_logo_file,
            v_enter_number,
            v_download,
            v_delete,
            v_edit,
            v_clone,
            v_send_by_email,
            v_link_copied,
            v_copy_link,
            v_add_a_discount,
            v_discount,
        } = vocabulary;
        const { isInitialFetching, discountModalIsOpen, invoice, errors, linkCopied } = this.state;

        return (
            <Loading flag={isInitialFetching || isFetching} mode="parentSize" withLogo={false}>
                <CustomScrollbar disableTimeEntriesFetch>
                    <div className="invoices-page-detailed-wrapper">
                        <div className={classNames('invoices-page-detailed-wrapper__header', {})}>
                            {this.isViewMode && (
                                <div
                                    onClick={() => this.props.history.push('/invoices')}
                                    className="invoices-page-detailed__back-button"
                                />
                            )}
                            <div className="invoices-page-detailed__title">{v_invoice}</div>
                        </div>
                        <div className={'invoices-page-detailed-form-wrapper'}>
                            <div
                                className={classNames('invoices-page-detailed', {
                                    'invoices-page-detailed--horizontal-padding': this.isViewMode,
                                })}
                            >
                                <div className="invoices-page-detailed__top">
                                    <div className="invoices-page-detailed__main-data">
                                        <div className="invoices-page-detailed__left">
                                            <div
                                                className={classNames('invoices-page-detailed__logo', {
                                                    'invoices-page-detailed__logo--empty': !invoice.image,
                                                })}
                                            >
                                                <ImagePicker
                                                    onFileLoaded={this.handleFileLoad}
                                                    onDeleteImage={this.handleFileDelete}
                                                    placeholder={v_select_logo_file}
                                                    imageUrl={
                                                        invoice.image && typeof invoice.image === 'string'
                                                            ? `${AppConfig.apiURL}${invoice.image}`
                                                            : null
                                                    }
                                                    isViewMode={this.isViewMode}
                                                />
                                            </div>
                                            <div className="invoices-page-detailed__main-data-form">
                                                <div className="input-wrapper">
                                                    <div>
                                                        <label>{`${v_invoice_number}:`}</label>
                                                        <div className="invoice-number">
                                                            <input
                                                                value={invoice.invoiceNumber}
                                                                onChange={e =>
                                                                    this.handleInputChange('invoiceNumber', e)
                                                                }
                                                                className="invoices-page-detailed__input "
                                                                type="text"
                                                                maxLength="15"
                                                                placeholder={v_enter_number}
                                                                disabled={this.isViewMode}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="input-wrapper__second-input">
                                                        <label>{`${v_invoice_due}:`}</label>
                                                        <div className="invoices-page-detailed__calendar-select">
                                                            <CalendarSelect
                                                                onChangeDate={date =>
                                                                    this.handleDateChange('dateDue', date)
                                                                }
                                                                date={invoice.dateDue}
                                                                disabled={this.isViewMode}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="second-input-wrapper">
                                                    <label>{`${v_invoice_date}:`}</label>
                                                    <div className="invoices-page-detailed__calendar-select">
                                                        <CalendarSelect
                                                            onChangeDate={date =>
                                                                this.handleDateChange('dateFrom', date)
                                                            }
                                                            date={invoice.dateFrom}
                                                            disabled={this.isViewMode}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="invoices-page-detailed__personal-information">
                                        <div className="invoices-page-detailed__personal-information-card">
                                            <div className="invoices-page-detailed__subtitle">{v_from}</div>
                                            <PersonSelect
                                                personsList={parseUsersData(currentTeamDetailedData)}
                                                invoice={invoice}
                                                userSender={invoice.sender}
                                                onChange={person => {
                                                    this.setState(prevState => ({
                                                        ...prevState,
                                                        errors: {
                                                            ...prevState.errors,
                                                            sender: false,
                                                        },
                                                    }));
                                                    this.handlePersonChange('sender', person);
                                                }}
                                                disabled={this.isViewMode}
                                                isErrorSender={errors.sender}
                                            />
                                        </div>
                                        <div className="invoices-page-detailed__personal-information-card">
                                            <div className="invoices-page-detailed__subtitle">{v_to}</div>
                                            <PersonSelect
                                                personsList={clientsList}
                                                selectedRecipient={invoice.recipient || invoice.to}
                                                onChange={person => {
                                                    this.setState(prevState => ({
                                                        ...prevState,
                                                        errors: {
                                                            ...prevState.errors,
                                                            recipient: false,
                                                        },
                                                    }));
                                                    this.handlePersonChange('recipient', person);
                                                }}
                                                placeholder={v_add_client}
                                                disabled={this.isViewMode}
                                                isError={errors.recipient}
                                                withAddLink
                                            />
                                        </div>
                                    </div>
                                </div>

                                <DetailedInvoiceProjectsTable
                                    mode={this.props.match.params.pageType}
                                    vocabulary={vocabulary}
                                    projects={invoice.projects}
                                    currency={invoice.currency}
                                    updateProject={this.handleUpdateProject}
                                    addProject={this.handleAddProject}
                                    removeProject={this.handleRemoveProject}
                                    onChangeInput={() => {
                                        this.setState(prevState => ({
                                            ...prevState,
                                            errors: {
                                                ...prevState.errors,
                                                projects: false,
                                            },
                                        }));
                                    }}
                                    isError={errors.projects}
                                />
                                <div className="invoices-page-detailed__wrapper">
                                    <div className="invoices-page-detailed__wrapper-summary">
                                        <div className="invoices-page-detailed__subtitle">{v_invoice_summary}</div>
                                        <div className="invoices-page-detailed__summary-table">
                                            <div className="invoices-page-detailed__summary-table-row">
                                                <span className="invoices-page-detailed__summary-title">
                                                    {v_subtotal}
                                                </span>
                                                <div className="invoices-page-detailed__summary-price">
                                                    <div>{invoice.currency.toUpperCase()}</div>
                                                    <span>
                                                        {internationalFormatNum(
                                                            fixNumberHundredths(
                                                                spaceAndFixNumber(calculateSubtotals(invoice.projects))
                                                            )
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="invoices-page-detailed__summary-table-row">
                                                <button
                                                    className="invoices-page-detailed__summary-discount"
                                                    onClick={() => {
                                                        if (this.isViewMode) return;
                                                        this.setState({ discountModalIsOpen: true });
                                                    }}
                                                >
                                                    {invoice.discount
                                                        ? `${invoice.discount}% ${v_discount}`
                                                        : v_add_a_discount}
                                                </button>
                                                {invoice.discount || this.isViewMode ? (
                                                    <div className="invoices-page-detailed__summary-price">
                                                        {invoice.currency.toUpperCase()}
                                                        <span>
                                                            -
                                                            {internationalFormatNum(
                                                                fixNumberHundredths(
                                                                    spaceAndFixNumber(
                                                                        subtotalWithDiscount(
                                                                            calculateSubtotals(invoice.projects),
                                                                            invoice.discount
                                                                        )
                                                                    )
                                                                )
                                                            )}
                                                        </span>
                                                    </div>
                                                ) : null}

                                                {invoice.discount ? (
                                                    <button
                                                        className={classNames(
                                                            'invoices-page-detailed__tool-button',
                                                            'invoices-page-detailed__tool-discount',
                                                            {
                                                                disabled: !this.isViewMode,
                                                            }
                                                        )}
                                                        onClick={() => {
                                                            if (this.isViewMode) return;
                                                            this.saveDiscount('0');
                                                        }}
                                                        data-tip={v_delete}
                                                    >
                                                        <DeleteIcon
                                                            className={classNames(
                                                                'invoices-page-detailed__icon-button',
                                                                {
                                                                    disabled: !this.isViewMode,
                                                                }
                                                            )}
                                                        />
                                                    </button>
                                                ) : null}
                                                {discountModalIsOpen && (
                                                    <DiscountInvoiceModal
                                                        saveDiscount={this.saveDiscount}
                                                        closeModal={this.closeDiscountModal}
                                                        initDiscount={invoice.discount}
                                                    />
                                                )}
                                            </div>

                                            <div className="invoices-page-detailed__summary-table-row">
                                                <span className="invoices-page-detailed__summary-title">{v_tax}</span>
                                                <div className="invoices-page-detailed__summary-price">
                                                    {invoice.currency.toUpperCase()}
                                                    <span>
                                                        {internationalFormatNum(
                                                            fixNumberHundredths(
                                                                spaceAndFixNumber(calculateTaxesSum(invoice.projects))
                                                            )
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="invoices-page-detailed__summary-table-row">
                                                <div className="invoices-page-detailed__summary-total">
                                                    <span className="invoices-page-detailed__summary-title">
                                                        {v_total}
                                                    </span>
                                                    <CurrencySelect
                                                        selectedCurrency={invoice.currency}
                                                        onChange={this.onChangeCurrency}
                                                        isViewMode={this.isViewMode}
                                                    />
                                                </div>

                                                <div className="invoices-page-detailed__summary-price">
                                                    {invoice.currency.toUpperCase()}
                                                    <span>
                                                        {internationalFormatNum(
                                                            fixNumberHundredths(
                                                                spaceAndFixNumber(
                                                                    calculateTotal(invoice.projects, invoice.discount)
                                                                )
                                                            )
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="invoices-page-detailed__comments">
                                    <div className="invoices-page-detailed__subtitle">{v_comments}</div>

                                    <TextareaAutosize
                                        value={invoice.comment || ''}
                                        onChange={e => this.handleInputChange('comment', e)}
                                        className="invoices-page-detailed__input invoices-page-detailed__textarea"
                                        disabled={this.isViewMode}
                                    />
                                </div>
                                {this.state.sendInvoiceModalData && (
                                    <SendInvoiceModal
                                        closeModal={this.toggleSendInvoiceModal}
                                        vocabulary={vocabulary}
                                        invoice={this.props.invoice}
                                        isInvoicePageDetailed={true}
                                    />
                                )}
                                {!this.isViewMode && (
                                    <div className="invoices-page-detailed__actions">
                                        <button
                                            onClick={this.handleSaveAction}
                                            className="invoices-page-detailed__action-button"
                                        >
                                            {v_save}
                                        </button>
                                        <button onClick={this.goBack} className="invoices-page-detailed__action-button">
                                            {v_cancel}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="invoices-page-detailed__tools">
                                <div className="invoices-page-detailed__tools-container">
                                    {this.isViewMode ? (
                                        <Link
                                            data-tip={v_edit}
                                            to={`/invoices/update/${invoice.id}`}
                                            className="invoices-page-detailed__tool-button"
                                        >
                                            <EditIcon className="invoices-page-detailed__icon-button" />
                                        </Link>
                                    ) : (
                                        <div
                                            data-tip={v_save}
                                            data-for="save"
                                            className="invoices-page-detailed__tool-button"
                                        >
                                            <SaveInvoice
                                                className="invoices-page-detailed__icon-button"
                                                onClick={this.handleSaveAction}
                                            />
                                        </div>
                                    )}
                                    <button
                                        className={classNames('invoices-page-detailed__tool-button', {
                                            disabled: !this.isViewMode,
                                        })}
                                        data-tip={v_download}
                                    >
                                        <SaveIcon
                                            className={classNames('invoices-page-detailed__icon-button', {
                                                disabled: !this.isViewMode,
                                            })}
                                            onClick={async () => {
                                                if (this.isViewMode) {
                                                    try {
                                                        let responce = await downloadInvoicePDF(invoice.id);
                                                        downloadPDF(responce.data, `${invoice.invoiceNumber}.pdf`);
                                                    } catch (error) {
                                                        console.log(error);
                                                        showNotificationAction({
                                                            type: 'error',
                                                            text: error.message,
                                                        });
                                                    }
                                                }
                                            }}
                                        />
                                    </button>
                                    <button
                                        className={classNames('invoices-page-detailed__tool-button', {
                                            disabled: !this.isViewMode,
                                        })}
                                        onClick={() => {
                                            if (this.isViewMode) {
                                                this.handleCloneInvoice();
                                            }
                                        }}
                                        data-tip={v_clone}
                                    >
                                        <CopyIcon
                                            className={classNames('invoices-page-detailed__icon-button', {
                                                disabled: !this.isViewMode,
                                            })}
                                        />
                                    </button>
                                    <button
                                        className={classNames('invoices-page-detailed__tool-button', {
                                            disabled: !this.isViewMode,
                                        })}
                                        data-tip={v_send_by_email}
                                    >
                                        <SendIcon
                                            className={classNames('invoices-page-detailed__icon-button', {
                                                disabled: !this.isViewMode,
                                            })}
                                            onClick={() => {
                                                if (this.isViewMode) {
                                                    this.setState({ sendInvoiceModalData: true });
                                                }
                                            }}
                                        />
                                    </button>
                                    <button
                                        className={classNames('invoices-page-detailed__tool-button', {
                                            disabled: !this.isViewMode,
                                        })}
                                        data-tip={linkCopied ? v_link_copied : v_copy_link}
                                        ref={this.copyLinkRef}
                                        onMouseLeave={() => this.setState({ linkCopied: false })}
                                    >
                                        <CopyLinkIcon
                                            className={classNames('invoices-page-detailed__icon-button icon-fill', {
                                                disabled: !this.isViewMode,
                                            })}
                                            onClick={() => this.copyToClipBoard(invoice)}
                                        />
                                    </button>
                                    <button
                                        className={classNames('invoices-page-detailed__tool-button', {
                                            disabled: !this.isViewMode,
                                        })}
                                        onClick={() => {
                                            if (this.isViewMode) {
                                                this.setState({ deleteInvoiceModal: true });
                                            }
                                        }}
                                        data-tip={v_delete}
                                    >
                                        <DeleteIcon
                                            className={classNames('invoices-page-detailed__icon-button', {
                                                disabled: !this.isViewMode,
                                            })}
                                        />
                                    </button>
                                    {/* {this.isViewMode && (
                                        <ReactTooltip className={'tool-tip'} arrowColor={' #FFFFFF'} place="right" />
                                    )}
                                    {!this.isViewMode && ( */}
                                    <ReactTooltip
                                        id={this.isViewMode ? null : 'save'}
                                        className={'tool-tip'}
                                        arrowColor={' #FFFFFF'}
                                        place="right"
                                        effect={'solid'}
                                    />
                                    {/* )} */}
                                </div>
                            </div>
                        </div>
                        {this.state.deleteInvoiceModal && (
                            <DeleteInvoiceModal
                                deleteInvoice={this.handleDeleteInvoice}
                                openCloseModal={this.closeDeleteModal}
                            />
                        )}
                    </div>
                </CustomScrollbar>
            </Loading>
        );
    }
}

const mapStateToProps = ({ teamReducer, clientsReducer, invoicesReducer, userReducer }) => ({
    currentTeamDetailedData: teamReducer.currentTeamDetailedData,
    clientsList: clientsReducer.clientsList,
    invoice: invoicesReducer.invoice,
    isFetching: invoicesReducer.isFetching,
    defaultUserSender: userReducer.user,
    sameInvoiceNumberErr: invoicesReducer.error,
    copiedInvoiceId: invoicesReducer.copiedInvoiceId,
});

const mapDispatchToProps = {
    getProjectsListActions,
    getCurrentTeamDetailedDataAction,
    getClientsAction,
    getInvoice,
    updateInvoice,
    addInvoice,
    deleteInvoiceById,
    showNotificationAction,
    deleteAvatarThunk,
    setCopiedInvoiceId,
};

export default withRouter(
    connect(
        mapStateToProps,
        mapDispatchToProps
    )(InvoicesPageDetailed)
);
