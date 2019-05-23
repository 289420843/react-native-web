import React, { Component } from 'react';
import View from '../View';

export default class HelpView extends Component {
  state = {
    content: false
  };

  constructor(props) {
    super(props);
    this.change = this.change.bind(this);
    setTimeout(() => {
      this.change();
    }, 200);
  }

  change() {
    this.setState({
      content: !this.state.content
    });
  }

  render() {
    return <View>{this.state.content ? <View /> : null}</View>;
  }
}
