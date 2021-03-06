// @flow
import React, { Component } from 'react';
import { Button, Container, Grid, Image, Header } from 'semantic-ui-react';
import { translate } from 'react-i18next';

import eos from '../../renderer/assets/images/eos.png';

import WelcomeAccount from './Welcome/Account';
import WelcomeAdvanced from './Welcome/Advanced';
import WelcomeBreadcrumb from './Welcome/Breadcrumb';
import WelcomeConnection from './Welcome/Connection';
import WelcomeHardwareLedger from './Welcome/Hardware/Ledger';
import WelcomePath from './Welcome/Path';
import WelcomeKey from './Welcome/Key';
import WelcomeWallet from './Welcome/Wallet';

import GlobalSettingsLanguage from './Global/Settings/Language';

const { shell } = require('electron');

class Welcome extends Component<Props> {
  state = {
    advancedSetup: false,
    hardwareLedgerImport: false,
    stageSelect: false
  };

  openLink = (url) => shell.openExternal(url);

  onStageSelect = (stage) => {
    this.setState({ stageSelect: stage });
  }

  cancelLedgerImport = () => {
    this.setState({ hardwareLedgerImport: false });
  }

  completeLedgerImport = (account, authorization) => {
    const {
      actions,
      connection,
      history,
      settings
    } = this.props;
    const {
      setSetting
    } = actions;
    setSetting('account', account);
    setSetting('authorization', authorization);
    setSetting('chainId', connection.chainId);
    setSetting('walletInit', true);
    setSetting('walletTemp', false);
    // Set this wallet as the used wallet
    actions.useWallet(connection.chainId, account, authorization);
    actions.clearValidationState();
    actions.validateNode(settings.node, connection.chainId);
    history.push('/voter');
  }

  hardwareLedgerImport = () => {
    this.setState({ hardwareLedgerImport: true });
  }

  cancelAdvanced = () => this.setState({ advancedSetup: false }, () => this.props.actions.setSettings({
    account: undefined,
    authorization: undefined,
    chainId: undefined,
    node: undefined,
  }))

  setupAdvanced = () => this.setState({ advancedSetup: true }, () => this.props.actions.setSettings({
    account: undefined,
    authorization: undefined,
    chainId: undefined,
    node: undefined,
  }))

  skipImport = () => {
    const {
      actions,
      history,
      settings
    } = this.props;
    const {
      setSetting
    } = actions;
    setSetting('account', '');
    setSetting('skipImport', true);
    actions.lockWallet();
    actions.clearValidationState();
    actions.validateNode(settings.node);
    history.push('/voter');
  }

  render() {
    const {
      actions,
      i18n,
      keys,
      ledger,
      settings,
      status,
      t,
      validate
    } = this.props;
    const {
      advancedSetup,
      hardwareLedgerImport,
      stageSelect
    } = this.state;
    let stage = 0;
    if (
      (validate.NODE === 'SUCCESS' && validate.ACCOUNT === 'SUCCESS' && validate.KEY === 'SUCCESS')
      || (settings.walletMode === 'cold' && settings.account && keys.key)
    ) {
      stage = 4;
    } else if (
      (validate.NODE === 'SUCCESS' && validate.ACCOUNT === 'SUCCESS')
      || (settings.walletMode === 'cold' && settings.account)
    ) {
      stage = 3;
    } else if (validate.NODE === 'SUCCESS') {
      stage = 2;
    }
    if (stageSelect !== false) {
      stage = stageSelect;
    }
    let stageElement = <WelcomeConnection onStageSelect={this.onStageSelect} settings={settings} stage={stage} />;
    if (stage >= 1) {
      // stageElement = <WelcomePath onStageSelect={this.onStageSelect} stage={stage} />;;
      if (stage >= 2 && (settings.chainId || validate.NODE === 'SUCCESS')) {
        stageElement = (
          <WelcomeAccount
            hardwareLedgerImport={this.hardwareLedgerImport}
            onStageSelect={this.onStageSelect}
            stage={stage}
          />
        );
        if (stage >= 3 && (settings.walletMode === 'cold' || validate.ACCOUNT === 'SUCCESS')) {
          stageElement = <WelcomeKey onStageSelect={this.onStageSelect} stage={stage} />;
          if (stage === 4 && (settings.walletMode === 'cold' || validate.KEY === 'SUCCESS')) {
            stageElement = <WelcomeWallet onStageSelect={this.onStageSelect} stage={stage} />;
          }
        }
      }
    }
    if (validate.NODE === 'SUCCESS' && hardwareLedgerImport) {
      stageElement = (
        <WelcomeHardwareLedger
          onClose={this.cancelLedgerImport}
          onComplete={this.completeLedgerImport}
          onStageSelect={this.onStageSelect}
          stage={stage}
        />
      );
    }
    if (advancedSetup) {
      stageElement = (
        <WelcomeAdvanced
          onClose={this.cancelAdvanced}
          onStageSelect={this.onStageSelect}
          stage={stage}
        />
      )
    }
    return (
      <div className="welcome">
        <style>
          {`
            body > div#root,
            body > div#root > div,
            body > div#root > div > div.welcome {
              height: 100%;
            }
          `}
        </style>
        <Grid
          textAlign="center"
          style={{ height: '100%' }}
        >
          <Grid.Column
            style={{ maxWidth: 450 }}
            textAlign="left"
            verticalAlign="middle"
          >
            <Header
              color="teal"
              textAlign="center"
            >
              <Image src={eos} />
              <Header.Content>
                {t('application_name')}
                <Header.Subheader>
                  {t('application_version')}
                </Header.Subheader>
              </Header.Content>
            </Header>
            {(stage >= 0)
              ? (
                <Container textAlign="center">
                  <WelcomeBreadcrumb
                    onStageSelect={this.onStageSelect}
                    stage={stage}
                    walletMode={settings.walletMode}
                  />
                </Container>
              )
              : false
            }
            {stageElement}
            <Container textAlign="center">
              <GlobalSettingsLanguage
                actions={actions}
                setLanguage={settings.lang}
                i18n={i18n}
                settings
                selection
              />
              {(stage === 0 && !advancedSetup)
                ? (
                  <p>
                    <Button
                      content={t('welcome:welcome_advanced_setup')}
                      color="purple"
                      icon="lab"
                      onClick={this.setupAdvanced}
                      size="tiny"
                      style={{ marginTop: '1em' }}
                    />
                  </p>
                )
                : false
              }
              {(!hardwareLedgerImport
                && (stage === 1 || (stage === 2 && validate.ACCOUNT !== 'SUCCESS'))
                && !settings.walletInit
                && settings.walletMode !== 'cold'
              )
                ? (
                  <p>
                    <Button
                      content={t('welcome:welcome_lookup_account_skip')}
                      icon="x"
                      onClick={this.skipImport}
                      size="small"
                      style={{ marginTop: '1em' }}
                    />
                  </p>
                )
                : false
              }
            </Container>
          </Grid.Column>
        </Grid>
      </div>
    );
  }
}

export default translate('welcome')(Welcome);
