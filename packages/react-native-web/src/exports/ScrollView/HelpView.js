import React, { Component } from 'react';
import DeviceEventEmitter from 'react-native-runweb/dist/DeviceEventEmitter';
import View from '../View';

export default class HelpView extends Component {
  state = {
    content: false
  };
  timer = null;

  constructor(props) {
    super(props);
    this.change = this.change.bind(this);
    this.ref_ = this.ref_.bind(this);
    this.onRouterChange = this.onRouterChange.bind(this);

    setTimeout(() => {
      this.change();
    }, 600);
  }

  onRouterChange() {
    setTimeout(() => {
      this.change();
    }, 600);
  }

  componentDidMount() {
    DeviceEventEmitter.addListener('_common_router_action_before', this.onRouterChange);
  }

  componentWillUnmount() {
    DeviceEventEmitter.removeListener('_common_router_action_before', this.onRouterChange);
  }

  change() {
    this.setState({
      content: !this.state.content
    });
  }

  ref_() {
    this.change();
  }

  render() {
    return <View ref={this.ref_}>{this.state.content ? <View /> : null}</View>;
  }
}
